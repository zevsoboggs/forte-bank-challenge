-- Скрипт для очистки всех подключений к базе forte
-- Запустите на PostgreSQL сервере

-- Посмотреть все активные подключения
SELECT pid, usename, application_name, client_addr, state, query_start
FROM pg_stat_activity
WHERE datname = 'forte';

-- Убить все подключения к базе forte (кроме текущего)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'forte'
  AND pid <> pg_backend_pid();
