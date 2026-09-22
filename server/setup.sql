-- ════════════════════════════════════════════════════════════
--  Dev Code Tracker — Database Setup (hosting-safe, MariaDB-safe)
--  Import this directly into the database your host created
--  (e.g. via phpMyAdmin → select the DB → Import tab)
-- ════════════════════════════════════════════════════════════

-- ── Table 1: Every single coding session ─────────────────────
CREATE TABLE IF NOT EXISTS time_sessions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    session_id       VARCHAR(50)   NOT NULL  COMMENT 'Unique ID from extension (prevents duplicates)',
    project          VARCHAR(255)  NOT NULL  COMMENT 'Workspace folder name (key)',
    display_name     VARCHAR(255)  NOT NULL  COMMENT 'Human readable project name',
    start_time       DATETIME      NOT NULL  COMMENT 'Session start (UTC)',
    end_time         DATETIME      NOT NULL  COMMENT 'Session end (UTC)',
    duration_seconds INT           NOT NULL DEFAULT 0,
    session_date     DATE GENERATED ALWAYS AS (DATE(start_time)) STORED,
    synced_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_session (session_id),
    INDEX idx_proj  (project),
    INDEX idx_start (start_time),
    INDEX idx_date  (session_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table 2: Aggregated totals per project per day ───────────
CREATE TABLE IF NOT EXISTS daily_summary (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    summary_date   DATE         NOT NULL,
    project        VARCHAR(255) NOT NULL,
    display_name   VARCHAR(255) NOT NULL,
    total_seconds  INT          NOT NULL DEFAULT 0,
    session_count  INT          NOT NULL DEFAULT 0,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq (summary_date, project)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table 3: Project registry ────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    project       VARCHAR(255)  NOT NULL PRIMARY KEY,
    display_name  VARCHAR(255)  NOT NULL,
    first_seen    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    last_seen     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;