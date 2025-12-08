-- +goose Up
-- +goose StatementBegin
INSERT INTO user_preferences (user_id, postal_code, weekly_budget, cook_frequency, dietary_preferences, allergies, servings_per_meal, cooking_skill)
VALUES (1, '80809', 55.7, 2, 'vegan, protein-heavy', 'peanut', 2, 'ADVANCED');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM user_preferences
where user_id = 1;
-- +goose StatementEnd
