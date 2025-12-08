-- +goose Up
-- +goose StatementBegin
INSERT INTO users (username, password_hash)
VALUES ('decidish_admin', '$2a$10$vgJ.qogFVzt6U8.zo.50cuaXW01iBt9FOd1bENY7ocxaqwyTIHFjC')
ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- +goose StatementEnd
