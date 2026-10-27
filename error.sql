-- CÂU LỆNH GÂY VI PHẠM TRIGGER:
UPDATE dbo.tc_coupons
SET max_uses = 5 
WHERE code = 'SUMMER2026';


SET NOCOUNT ON;

PRINT '=====================================================';
PRINT '  KỊCH BẢN KIỂM THỬ TRIGGER: trg_Coupon_ProtectUsageLimit';
PRINT '=====================================================';

BEGIN TRANSACTION;
BEGIN TRY
    -- -------------------------------------------------------------
    -- BƯỚC 1: TẠO DỮ LIỆU GIẢ LẬP (FIXTURE SETUP)
    -- -------------------------------------------------------------
    DECLARE @org_id uniqueidentifier = NEWID();
    DECLARE @coupon_id uniqueidentifier = NEWID();
    DECLARE @user_id uniqueidentifier = NEWID();
    DECLARE @event_id uniqueidentifier = NEWID();
    DECLARE @order_id1 uniqueidentifier = NEWID();
    DECLARE @order_id2 uniqueidentifier = NEWID();

    -- Giả lập Coupon với max_uses ban đầu là 10
    INSERT INTO dbo.tc_coupons (
        id, organization_id, code, discount_type, 
        percentage_value, max_uses, valid_from, valid_to, active
    )
    VALUES (
        @coupon_id, @org_id, 'TEST_DISCOUNT_VIP', 'PERCENTAGE', 
        10.00, 10, SYSUTCDATETIME(), DATEADD(day, 7, SYSUTCDATETIME()), 1
    );

    -- Giả lập các lượt sử dụng trong bảng tc_coupon_redemptions:
    -- Tổng số lượt đang chiếm giữ = 4 (CONSUMED) + 2 (RESERVED) = 6 lượt.
    -- Có thêm 3 lượt RELEASED (đã hủy) -> Không được tính vào tổng.
    INSERT INTO dbo.tc_coupon_redemptions (id, coupon_id, order_id, status, expires_at)
    VALUES 
        (NEWID(), @coupon_id, NEWID(), 'CONSUMED', DATEADD(hour, 1, SYSUTCDATETIME())),
        (NEWID(), @coupon_id, NEWID(), 'CONSUMED', DATEADD(hour, 1, SYSUTCDATETIME())),
        (NEWID(), @coupon_id, NEWID(), 'CONSUMED', DATEADD(hour, 1, SYSUTCDATETIME())),
        (NEWID(), @coupon_id, NEWID(), 'CONSUMED', DATEADD(hour, 1, SYSUTCDATETIME())),
        (NEWID(), @coupon_id, NEWID(), 'RESERVED', DATEADD(minute, 10, SYSUTCDATETIME())),
        (NEWID(), @coupon_id, NEWID(), 'RESERVED', DATEADD(minute, 10, SYSUTCDATETIME())),
        (NEWID(), @coupon_id, NEWID(), 'RELEASED', DATEADD(minute, -5, SYSUTCDATETIME())),
        (NEWID(), @coupon_id, NEWID(), 'RELEASED', DATEADD(minute, -10, SYSUTCDATETIME()));

    PRINT N'-> Setup thành công: Coupon có max_uses = 10, thực tế đang chiếm chỗ = 6 lượt.';

    -- -------------------------------------------------------------
    -- BƯỚC 2: CASE HỢP LỆ (Hạ max_uses xuống 7 >= 6) -> PHẢI THÀNH CÔNG
    -- -------------------------------------------------------------
    PRINT N'-----------------------------------------------------';
    PRINT N'TEST CASE 1: Hạ max_uses xuống 7 (hợp lệ vì 7 >= 6)...';
    
    UPDATE dbo.tc_coupons 
    SET max_uses = 7 
    WHERE id = @coupon_id;

    PRINT N'>> KẾT QUẢ: UPDATE thành công! max_uses hiện tại là: ' + 
          CAST((SELECT max_uses FROM dbo.tc_coupons WHERE id = @coupon_id) AS varchar(10));

    -- -------------------------------------------------------------
    -- BƯỚC 3: CASE VI PHẠM (Cố tình hạ max_uses xuống 5 < 6) -> TRIGGER BẮT LỖI
    -- -------------------------------------------------------------
    PRINT N'-----------------------------------------------------';
    PRINT N'TEST CASE 2: Cố tình hạ max_uses xuống 5 (vi phạm vì 5 < 6)...';
    
    BEGIN TRY
        -- Lệnh này sẽ kích hoạt trigger trg_Coupon_ProtectUsageLimit và bị THROW 51107:
        UPDATE dbo.tc_coupons 
        SET max_uses = 5 
        WHERE id = @coupon_id;

        PRINT N'>> THẤT BẠI: Lẽ ra lệnh này phải bị chặn nhưng lại thực thi được!';
    END TRY
    BEGIN CATCH
        PRINT N'>> BẮT LỖI THÀNH CÔNG TỪ TRIGGER:';
        PRINT N'   - Mã lỗi (Error Number): ' + CAST(ERROR_NUMBER() AS varchar(10));
        PRINT N'   - Thông báo (Message)  : ' + ERROR_MESSAGE();
        PRINT N'   - Mức độ nghiêm trọng  : ' + CAST(ERROR_SEVERITY() AS varchar(10));
    END CATCH;

    -- -------------------------------------------------------------
    -- BƯỚC 4: CASE CẬP NHẬT NHIỀU DÒNG (MULTI-ROW UPDATE VI PHẠM)
    -- -------------------------------------------------------------
    PRINT N'-----------------------------------------------------';
    PRINT N'TEST CASE 3: Cập nhật nhiều coupon cùng lúc (1 dòng hợp lệ, 1 dòng vi phạm)...';
    
    -- Tạo thêm coupon thứ 2 không có ai dùng
    DECLARE @coupon_id2 uniqueidentifier = NEWID();
    INSERT INTO dbo.tc_coupons (id, organization_id, code, discount_type, percentage_value, max_uses, valid_from, valid_to, active)
    VALUES (@coupon_id2, @org_id, 'TEST_DISCOUNT_FREE', 'PERCENTAGE', 5.00, 20, SYSUTCDATETIME(), DATEADD(day, 7, SYSUTCDATETIME()), 1);

    BEGIN TRY
        -- Lệnh UPDATE đồng thời cả 2 coupon: Coupon 2 hạ xuống 15 (hợp lệ), nhưng Coupon 1 hạ xuống 3 (vi phạm)
        UPDATE dbo.tc_coupons 
        SET max_uses = CASE WHEN id = @coupon_id THEN 3 ELSE 15 END
        WHERE id IN (@coupon_id, @coupon_id2);

        PRINT N'>> THẤT BẠI: Multi-row không bị chặn!';
    END TRY
    BEGIN CATCH
        PRINT N'>> BẮT LỖI THÀNH CÔNG: Toàn bộ câu lệnh Multi-row bị Rollback do có 1 dòng vi phạm!';
        PRINT N'   - Thông báo: ' + ERROR_MESSAGE();
    END CATCH;

END TRY
BEGIN CATCH
    PRINT N'Lỗi không mong muốn trong kịch bản: ' + ERROR_MESSAGE();
END CATCH;

-- Dọn dẹp sạch sẽ môi trường sau khi test
ROLLBACK TRANSACTION;
PRINT N'=====================================================';
PRINT N'  ĐÃ ROLLBACK TOÀN BỘ DỮ LIỆU TEST - DATABASE AN TOÀN';
PRINT N'=====================================================';







-- index test

SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Lấy số tiền (1 giá trị) của đơn hàng gần nhất của User
SELECT TOP 1 total_amount
FROM dbo.tc_orders
WHERE user_id = 'c1000000-0000-0000-0000-000000000001' -- Thay bằng 1 user_id bất kỳ trong DB của bạn
ORDER BY created_at DESC;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;


-- no index
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Trả về 1 giá trị nhưng ÉP KHÔNG DÙNG INDEX (dùng Clustered Scan)
SELECT TOP 1 total_amount
FROM dbo.tc_orders WITH (INDEX([PK_Orders])) -- Ép dùng PK thay vì Index của bạn
WHERE user_id = 'c1000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;

-- role
-- liệt kê
SELECT 
    pr.name AS principal_name,
    pe.class_desc,
    pe.permission_name,
    pe.state_desc AS permission_state, -- GRANT, DENY
    OBJECT_SCHEMA_NAME(pe.major_id) AS schema_name,
    OBJECT_NAME(pe.major_id) AS object_name
FROM sys.database_permissions pe
JOIN sys.database_principals pr ON pe.grantee_principal_id = pr.principal_id
WHERE pr.name = 'tc_worker'
ORDER BY object_name, pe.permission_name;


-- Thu hồi quyền thực thi trên thủ tục cụ thể
REVOKE EXECUTE ON dbo.usp_ApplyPaymentResult FROM tc_worker;
-- Cấp quyền Đọc (SELECT) trên toàn schema dbo
GRANT SELECT ON SCHEMA::dbo TO tc_worker;

-- Cấp quyền Ghi (INSERT, UPDATE, DELETE) trên toàn schema dbo
GRANT INSERT, UPDATE, DELETE ON SCHEMA::dbo TO tc_worker;




