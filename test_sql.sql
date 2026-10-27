-- usp_ApplyOrderCoupon
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE PROCEDURE dbo.usp_ApplyOrderCoupon
    @order_id uniqueidentifier, 
    @actor_id uniqueidentifier, 
    @coupon_code varchar(80) = NULL
AS
BEGIN
    SET NOCOUNT ON; 
    SET XACT_ABORT ON;

    DECLARE @started bit = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
    IF @started = 1 BEGIN TRANSACTION; ELSE SAVE TRANSACTION tc_sp03;

    BEGIN TRY
        DECLARE @event_id uniqueidentifier, @organization_id uniqueidentifier, @hold_id uniqueidentifier,
                @subtotal decimal(19,0), @old_coupon uniqueidentifier, @new_coupon uniqueidentifier,
                @discount decimal(19,0) = 0, @hold_expires_at datetime2(3), @now datetime2(3) = SYSUTCDATETIME();

        -- 1. Kiểm tra nhanh (chưa khóa) đơn hàng thuộc actor, đang chờ thanh toán, hold còn hiệu lực
        SELECT @event_id = o.event_id, @hold_id = o.hold_id
        FROM dbo.tc_orders o JOIN dbo.tc_ticket_holds h ON h.id = o.hold_id
        WHERE o.id = @order_id AND o.user_id = @actor_id AND o.status = 'PENDING_PAYMENT' 
          AND h.status = 'ACTIVE' AND h.expires_at > @now;

        IF @event_id IS NULL THROW 51230, 'Order is not coupon-eligible', 1;

        -- 2. Khóa bi quan: event trước, rồi order+hold cùng lúc (đúng thứ tự tránh deadlock)
        SELECT @organization_id = organization_id FROM dbo.tc_events WITH (UPDLOCK, HOLDLOCK) WHERE id = @event_id AND status = 'PUBLISHED';
        IF @organization_id IS NULL THROW 51231, 'Event is unavailable', 1;

        SET @now = SYSUTCDATETIME();
        SELECT @subtotal = o.subtotal_amount, @old_coupon = o.coupon_id, @hold_expires_at = h.expires_at
        FROM dbo.tc_orders o WITH (UPDLOCK, HOLDLOCK)
        JOIN dbo.tc_ticket_holds h WITH (UPDLOCK, HOLDLOCK) ON h.id = o.hold_id
        WHERE o.id = @order_id AND o.user_id = @actor_id AND o.status = 'PENDING_PAYMENT' 
          AND h.status = 'ACTIVE' AND h.expires_at > @now;

        IF @subtotal IS NULL THROW 51230, 'Order is not coupon-eligible', 1;

        -- 3. Không cho phép đổi coupon nếu có thanh toán đang PENDING/UNKNOWN
        IF EXISTS (SELECT 1 FROM dbo.tc_payments WHERE order_id = @order_id AND status IN ('PENDING', 'UNKNOWN'))
            THROW 51232, 'Coupon cannot change while payment is unresolved', 1;

        -- 4. Tìm coupon mới
        IF @coupon_code IS NOT NULL
            SELECT @new_coupon = id FROM dbo.tc_coupons WITH (UPDLOCK, HOLDLOCK)
            WHERE organization_id = @organization_id AND code = @coupon_code;

        IF @coupon_code IS NOT NULL AND @new_coupon IS NULL THROW 51233, 'Coupon not found', 1;

        -- Idempotency: coupon không đổi thì trả về luôn
        IF @old_coupon = @new_coupon OR (@old_coupon IS NULL AND @new_coupon IS NULL) BEGIN
            SELECT subtotal_amount, discount_amount, total_amount, coupon_id FROM dbo.tc_orders WHERE id = @order_id;
            IF @started = 1 COMMIT TRANSACTION; RETURN;
        END;

        -- 5. Kiểm tra điều kiện áp dụng mã
        IF @new_coupon IS NOT NULL BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.fn_GetCouponEligibility(@new_coupon, @organization_id, @subtotal, @now) WHERE is_eligible = 1)
                THROW 51234, 'Coupon is not eligible', 1;
            SELECT @discount = dbo.fn_CalculateCouponDiscountCapped(@subtotal, id)
            FROM dbo.tc_coupons WHERE id = @new_coupon;
            IF @discount IS NULL THROW 51235, 'Coupon discount is invalid', 1;
        END;

        -- 6. Quản lý bản ghi giữ chỗ mã giảm giá trong tc_coupon_redemptions
        IF EXISTS (SELECT 1 FROM dbo.tc_coupon_redemptions WHERE order_id = @order_id)
            UPDATE dbo.tc_coupon_redemptions
            SET coupon_id = COALESCE(@new_coupon, coupon_id),
                status = CASE WHEN @new_coupon IS NULL THEN 'RELEASED' ELSE 'RESERVED' END,
                reserved_at = CASE WHEN @new_coupon IS NULL THEN reserved_at ELSE @now END,
                expires_at = CASE WHEN @new_coupon IS NULL THEN expires_at ELSE @hold_expires_at END,
                consumed_at = NULL, 
                released_at = CASE WHEN @new_coupon IS NULL THEN @now ELSE NULL END
            WHERE order_id = @order_id;
        ELSE IF @new_coupon IS NOT NULL
            INSERT dbo.tc_coupon_redemptions(coupon_id, order_id, expires_at)
            VALUES (@new_coupon, @order_id, @hold_expires_at);

        -- 7. Cập nhật đơn hàng, tăng version (optimistic locking)
        UPDATE dbo.tc_orders 
        SET coupon_id = @new_coupon, 
            discount_amount = @discount,
            total_amount = @subtotal - @discount, 
            version = version + 1 
        WHERE id = @order_id;

        IF @started = 1 COMMIT TRANSACTION;
        SELECT subtotal_amount, discount_amount, total_amount, coupon_id FROM dbo.tc_orders WHERE id = @order_id;

    END TRY 
    BEGIN CATCH
        IF @started = 1 AND XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        ELSE IF @started = 0 AND XACT_STATE() = 1 ROLLBACK TRANSACTION tc_sp03;
        THROW;
    END CATCH
END;
GO


-- usp_ApplyPaymentResult

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE PROCEDURE dbo.usp_ApplyPaymentResult
    @order_id uniqueidentifier, 
    @actor_id uniqueidentifier = NULL, 
    @payment_id uniqueidentifier = NULL,
    @verified_result nvarchar(max), 
    @ticket_codes nvarchar(max) = NULL, 
    @retry_failed_compensation bit = 0
AS
BEGIN
    SET NOCOUNT ON; 
    SET XACT_ABORT ON;
    
    DECLARE @lock_count bigint;
    DECLARE @started bit = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
    IF @started = 1 BEGIN TRANSACTION; ELSE SAVE TRANSACTION tc_sp09;
    
    BEGIN TRY
        -- 1. Thẩm định định dạng JSON đầu vào
        IF ISJSON(@verified_result) <> 1 THROW 51390, 'Verified result must be JSON', 1;
        
        DECLARE @result varchar(20) = JSON_VALUE(@verified_result, '$.status'),
                @provider_reference nvarchar(200) = JSON_VALUE(@verified_result, '$.providerReference'),
                @event_id uniqueidentifier, @hold_id uniqueidentifier, @owner_id uniqueidentifier,
                @accepted uniqueidentifier, @sale_start datetime2(3), @sale_end datetime2(3),
                @order_status varchar(30), @hold_status varchar(20), @expires datetime2(3),
                @event_status varchar(30), @total decimal(19,0), @payment_status varchar(20),
                @now datetime2(3) = SYSUTCDATETIME();
                
        IF @result IS NULL OR @result NOT IN ('CAPTURED', 'FAILED', 'UNKNOWN') 
            THROW 51391, 'Unsupported payment result', 1;
            
        -- Lấy nhanh (chưa khóa) các id cần thiết để xác định phạm vi khóa
        SELECT @event_id = event_id, @hold_id = hold_id, @owner_id = user_id
        FROM dbo.tc_orders WHERE id = @order_id;
        IF @event_id IS NULL THROW 51392, 'Order not found', 1;
        
        -- Đặt khóa bi quan trên event + hold + order trong một câu lệnh duy nhất
        SELECT @event_status = e.status, @sale_start = e.sale_start, @sale_end = e.sale_end,
               @hold_status = h.status, @expires = h.expires_at,
               @order_status = o.status, @total = o.total_amount, @accepted = o.accepted_payment_id
        FROM dbo.tc_orders o WITH (UPDLOCK, HOLDLOCK)
        JOIN dbo.tc_events e WITH (UPDLOCK, HOLDLOCK) ON e.id = o.event_id
        JOIN dbo.tc_ticket_holds h WITH (UPDLOCK, HOLDLOCK) ON h.id = o.hold_id
        WHERE o.id = @order_id;
        
        SET @now = SYSUTCDATETIME();
        
        -- 2. Kiểm tra phân quyền thực thi
        IF @payment_id IS NULL BEGIN
            -- Đơn hàng 0 đồng (miễn phí)
            IF @actor_id IS NULL OR @actor_id <> @owner_id OR @total <> 0 OR @result <> 'CAPTURED'
                THROW 51393, 'Only the owner may complete a zero-value order', 1;
        END ELSE BEGIN
            -- Chỉ Worker hệ thống (tc_worker) hoặc Admin mới được nạp kết quả thanh toán từ cổng
            IF COALESCE(IS_ROLEMEMBER('tc_worker'), 0) <> 1 AND COALESCE(IS_MEMBER('db_owner'), 0) <> 1
                THROW 51389, 'Buyer principal cannot apply a paid provider result', 1;
                
            IF @result = 'CAPTURED' AND NULLIF(LTRIM(RTRIM(@provider_reference)), N'') IS NULL 
                THROW 51801, 'Captured result requires provider reference', 1;
                
            SELECT @payment_status = status FROM dbo.tc_payments WITH (UPDLOCK, HOLDLOCK)
            WHERE id = @payment_id AND order_id = @order_id AND amount = @total;
            IF @payment_status IS NULL THROW 51394, 'Payment does not match order amount', 1;
            
            IF EXISTS (SELECT 1 FROM dbo.tc_payments WHERE id = @payment_id AND provider_reference IS NOT NULL AND @provider_reference IS NOT NULL AND provider_reference <> @provider_reference) 
                THROW 51802, 'Provider reference conflict', 1;
                
            -- Xử lý Idempotent: Nếu đã thanh toán thành công trước đó thì trả kết quả ngay
            IF @payment_status = 'CAPTURED' AND @order_status = 'PAID' AND @accepted = @payment_id BEGIN
                SELECT @order_status AS order_status, @payment_status AS payment_status;
                IF @started = 1 COMMIT TRANSACTION; RETURN;
            END;
            
            UPDATE dbo.tc_payments 
            SET status = @result,
                provider_reference = COALESCE(@provider_reference, provider_reference),
                captured_at = CASE WHEN @result = 'CAPTURED' THEN COALESCE(captured_at, @now) ELSE captured_at END,
                version = version + 1 
            WHERE id = @payment_id;
        END;
        
        -- Nếu giao dịch FAILED hoặc UNKNOWN
        IF @result <> 'CAPTURED' BEGIN
            IF @started = 1 COMMIT TRANSACTION;
            SELECT @order_status AS order_status, @result AS payment_status; 
            RETURN;
        END;
        
        -- 3. XỬ LÝ LATE CAPTURED (TIỀN VÀO MUỘN KHI HOLD ĐÃ HẾT HẠN) -> BỒI HOÀN (COMPENSATION)
        IF @order_status <> 'PENDING_PAYMENT' OR @event_status <> 'PUBLISHED' OR @hold_status <> 'ACTIVE' OR @expires <= @now OR @now < @sale_start OR @now >= @sale_end BEGIN
            IF @payment_id IS NULL THROW 51395, 'Zero-value order expired before completion', 1;
            
            -- Tự động sinh nghĩa vụ hoàn tiền (Compensation Refund Obligation)
            IF NOT EXISTS (SELECT 1 FROM dbo.vw_RefundAttemptLedger WHERE payment_id = @payment_id AND purpose = 'PAYMENT_COMPENSATION' AND status IN ('PENDING', 'UNKNOWN', 'SUCCEEDED'))
            BEGIN
                IF @retry_failed_compensation = 0 AND EXISTS (SELECT 1 FROM dbo.vw_RefundAttemptLedger WHERE payment_id = @payment_id AND purpose = 'PAYMENT_COMPENSATION' AND status = 'FAILED')
                    THROW 51396, 'Compensation retry requires explicit authorization', 1;
                    
                DECLARE @compensation_id uniqueidentifier = NEWID();
                INSERT dbo.tc_refund_obligations(id, order_id, payment_id, amount, purpose, status, current_attempt_id)
                VALUES (@compensation_id, @order_id, @payment_id, @total, 'PAYMENT_COMPENSATION', 'PROCESSING', @compensation_id);
                
                INSERT dbo.tc_refund_transfer_logs(id, refund_id, attempt_no, status, result)
                VALUES (@compensation_id, @compensation_id, 1, 'PENDING', 'PENDING');
            END;
            
            IF @started = 1 COMMIT TRANSACTION;
            SELECT CAST('COMPENSATION_PENDING' AS varchar(30)) AS order_status, CAST('CAPTURED' AS varchar(20)) AS payment_status; 
            RETURN;
        END;
        
        -- 4. Parse danh sách mã vé và mã băm QR bằng OPENJSON
        IF ISJSON(@ticket_codes) <> 1 THROW 51397, 'Ticket codes must be a JSON array', 1;
        DECLARE @issued TABLE(ordinal int PRIMARY KEY, ticket_code varchar(100), qr_hash varbinary(64));
        INSERT @issued
        SELECT CONVERT(int, [key]) + 1, JSON_VALUE(value, '$.ticketCode'),
               TRY_CONVERT(varbinary(64), JSON_VALUE(value, '$.qrSecretHashHex'), 2)
        FROM OPENJSON(@ticket_codes);
        
        DECLARE @expected int = (SELECT SUM(quantity) FROM dbo.tc_order_items WHERE order_id = @order_id);
        IF @expected IS NULL OR @expected <> (SELECT COUNT(*) FROM @issued)
           OR EXISTS (SELECT 1 FROM @issued WHERE ticket_code IS NULL OR qr_hash IS NULL)
           OR EXISTS (SELECT ticket_code FROM @issued GROUP BY ticket_code HAVING COUNT(*) > 1)
            THROW 51398, 'Ticket identities do not match order quantity', 1;
            
        -- 5. Khóa và kiểm tra tồn kho ghế / vé đứng
        SELECT @lock_count = COUNT_BIG(*) FROM dbo.tc_zones z WITH (UPDLOCK, HOLDLOCK)
        WHERE EXISTS (SELECT 1 FROM dbo.tc_order_items oi WHERE oi.order_id = @order_id AND oi.zone_id = z.id);
        
        SELECT @lock_count = COUNT_BIG(*) FROM dbo.tc_seats s WITH (UPDLOCK, HOLDLOCK)
        WHERE EXISTS (SELECT 1 FROM dbo.tc_order_items oi WHERE oi.order_id = @order_id AND oi.seat_id = s.id);
        
        IF EXISTS (SELECT 1 FROM dbo.tc_seats s JOIN dbo.tc_order_items oi ON oi.seat_id = s.id
                   WHERE oi.order_id = @order_id AND s.status <> 'HELD')
            THROW 51388, 'Held seat inventory is inconsistent', 1;
            
        -- 6. CHUYỂN TRẠNG THÁI NGUYÊN TỬ TRONG GIAO DỊCH (ATOMIC UPDATES)
        -- Chuyển trạng thái ghế HELD -> SOLD
        UPDATE s SET status = 'SOLD', version = s.version + 1 
        FROM dbo.tc_seats s JOIN dbo.tc_order_items oi ON oi.seat_id = s.id 
        WHERE oi.order_id = @order_id AND s.status = 'HELD';
        
        -- Cập nhật số lượng vé khu vực đứng
        UPDATE z 
        SET held_quantity = held_quantity - q.quantity, 
            sold_quantity = sold_quantity + q.quantity, 
            version = z.version + 1
        FROM dbo.tc_zones z 
        JOIN (SELECT zone_id, SUM(quantity) quantity FROM dbo.tc_order_items WHERE order_id = @order_id AND seat_id IS NULL GROUP BY zone_id) q 
          ON q.zone_id = z.id;
          
        -- Chốt trạng thái Hold & Coupon thành CONSUMED
        UPDATE dbo.tc_ticket_holds SET status = 'CONSUMED', version = version + 1 WHERE id = @hold_id AND status = 'ACTIVE';
        UPDATE dbo.tc_coupon_redemptions SET status = 'CONSUMED', consumed_at = @now WHERE order_id = @order_id AND status = 'RESERVED';
        
        -- Cập nhật đơn hàng thành PAID
        UPDATE dbo.tc_orders 
        SET status = 'PAID', accepted_payment_id = @payment_id, paid_at = @now, version = version + 1 
        WHERE id = @order_id;
        
        -- Xuất vé điện tử vào tc_tickets
        WITH allocations AS (
            SELECT *, ROW_NUMBER() OVER (ORDER BY order_item_id, ticket_ordinal) AS ordinal
            FROM dbo.fn_AllocateTicketPaidAmounts(@order_id)
        )
        INSERT dbo.tc_tickets(order_item_id, ticket_code, qr_secret_hash, paid_amount)
        SELECT a.order_item_id, i.ticket_code, i.qr_hash, a.paid_amount 
        FROM allocations a JOIN @issued i ON i.ordinal = a.ordinal;
        
        IF (SELECT SUM(paid_amount) FROM dbo.tc_tickets t JOIN dbo.tc_order_items oi ON oi.id = t.order_item_id WHERE oi.order_id = @order_id) <> @total
            THROW 51399, 'Ticket paid amount allocation mismatch', 1;
            
        -- Transactional Outbox: Ghi sự kiện thông báo bất đồng bộ
        INSERT dbo.tc_outbox(event_type, aggregate_type, aggregate_id, payload, idempotency_key)
        VALUES ('ORDER_PAID', 'ORDER', @order_id, CONCAT(N'{"orderId":"', @order_id, N'"}'), CONCAT('order-paid:', @order_id));
        
        IF @started = 1 COMMIT TRANSACTION;
        SELECT CAST('PAID' AS varchar(30)) AS order_status, @result AS payment_status;
        
    END TRY 
    BEGIN CATCH
        IF @started = 1 AND XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        ELSE IF @started = 0 AND XACT_STATE() = 1 ROLLBACK TRANSACTION tc_sp09;
        THROW;
    END CATCH
END;
GO