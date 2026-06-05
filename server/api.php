<?php

/**
 * Dev Code Tracker — PHP API  v3.0.0
 * ─────────────────────────────────────────────────────────────
 * Upload this file (and dashboard.html) to your web server.
 * Edit the $config block below, then run setup.sql once.
 *
 * Endpoints:
 *   POST api.php                   → receive sessions from extension
 *   GET  api.php?action=dashboard  → all data for dashboard
 *   GET  api.php?action=summary&days=7
 *   GET  api.php?action=projects
 *   GET  api.php?action=sessions&project=X&limit=50
 *   POST api.php {action:rename,project:X,display_name:Y}
 *   POST api.php {action:delete,project:X}
 */

// ── CORS ─────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ══════════════════════════════════════════════════════════════
//  ⚙️  EDIT THESE VALUES
// ══════════════════════════════════════════════════════════════
$config = [
    'db_host'      => 'localhost',
    'db_name'      => 'u636872366_devtracker',
    'db_user'      => 'u636872366_devtracker',
    'db_password'  => '#sK>OS+3H7',
    'api_key'      => 'dt_7Xk2mP9qR4nV8wZ3cY6jL1sF5hB0eA',
    'require_auth' => true,
    'timezone_offset' => 330, // Offset from UTC in minutes (e.g. 330 for IST)
];
// ══════════════════════════════════════════════════════════════

// ── Database ─────────────────────────────────────────────────
function db(array $c): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $c['db_user'], $c['db_password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

// Auto-create all tables on first request
function ensureTables(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS time_sessions (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            session_id       VARCHAR(50)   NOT NULL  COMMENT 'Unique ID from extension',
            project          VARCHAR(255)  NOT NULL  COMMENT 'Folder/workspace key',
            display_name     VARCHAR(255)  NOT NULL  COMMENT 'Human-readable name',
            start_time       DATETIME      NOT NULL,
            end_time         DATETIME      NOT NULL,
            duration_seconds INT           NOT NULL DEFAULT 0,
            synced_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_session (session_id),
            INDEX idx_proj  (project),
            INDEX idx_start (start_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
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
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS projects (
            project       VARCHAR(255)  NOT NULL PRIMARY KEY,
            display_name  VARCHAR(255)  NOT NULL,
            first_seen    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            last_seen     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
}

// ── Response helpers ──────────────────────────────────────────
function ok(array $data = [], int $code = 200): void
{
    http_response_code($code);
    echo json_encode(array_merge(['success' => true], $data), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $msg, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_PRETTY_PRINT);
    exit;
}

// ── Route ─────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Auth for GET requests ─────────────────────────────────
if ($method === 'GET' && $config['require_auth']) {
    if (trim($_GET['key'] ?? '') !== $config['api_key']) fail('Unauthorized', 401);
}

$tz = (int)($config['timezone_offset'] ?? 330);

try {
    $pdo = db($config);
    ensureTables($pdo);

    // ── POST: receive sessions from VS Code extension ──────────
    if ($method === 'POST') {
        $rawBody = file_get_contents('php://input');
        if (strlen($rawBody) > 5 * 1024 * 1024) fail('Payload too large', 413); // 5MB limit
        $body = json_decode($rawBody, true);
        if (!$body) fail('Invalid JSON body');

        // Auth
        if ($config['require_auth'] && ($body['api_key'] ?? '') !== $config['api_key']) {
            fail('Unauthorized — check your API key in VS Code settings', 401);
        }

        // ── POST: rename action ───────────────────────────────────
        if (($body['action'] ?? '') === 'rename') {
            $proj  = trim($body['project']      ?? '');
            $dname = trim($body['display_name'] ?? '');
            if (!$proj || !$dname) fail('project and display_name are required');

            foreach (['projects', 'daily_summary', 'time_sessions'] as $tbl) {
                $pdo->prepare("UPDATE $tbl SET display_name=? WHERE project=?")->execute([$dname, $proj]);
            }
            ok(['message' => "Renamed '$proj' to '$dname'"]);
        }

        // ── POST: delete action ───────────────────────────────────
        if (($body['action'] ?? '') === 'delete') {
            $proj = trim($body['project'] ?? '');
            if (!$proj) fail('project is required');

            foreach (['time_sessions', 'daily_summary', 'projects'] as $tbl) {
                $pdo->prepare("DELETE FROM $tbl WHERE project=?")->execute([$proj]);
            }
            ok(['message' => "Deleted project '$proj'"]);
        }

        $sessions = $body['sessions'] ?? [];
        if (empty($sessions)) fail('No sessions in request');

        $stmtSess = $pdo->prepare("
            INSERT INTO time_sessions
                (session_id, project, display_name, start_time, end_time, duration_seconds)
            VALUES (:sid, :proj, :dname, :st, :et, :dur)
            ON DUPLICATE KEY UPDATE
                display_name     = VALUES(display_name),
                end_time         = VALUES(end_time),
                duration_seconds = VALUES(duration_seconds),
                synced_at        = CURRENT_TIMESTAMP
        ");

        $stmtSum = $pdo->prepare("
            INSERT INTO daily_summary (summary_date, project, display_name, total_seconds, session_count)
            SELECT :date, :proj, :dname,
                   COALESCE(SUM(duration_seconds),0),
                   COUNT(*)
            FROM time_sessions
            WHERE DATE(DATE_ADD(start_time, INTERVAL {$tz} MINUTE)) = :date2 AND project = :proj2
            ON DUPLICATE KEY UPDATE
                total_seconds = VALUES(total_seconds),
                session_count = VALUES(session_count),
                display_name  = VALUES(display_name)
        ");

        $stmtProj = $pdo->prepare("
            INSERT INTO projects (project, display_name)
            VALUES (:proj, :dname)
            ON DUPLICATE KEY UPDATE
                display_name = VALUES(display_name),
                last_seen    = CURRENT_TIMESTAMP
        ");

        $inserted = 0;
        $agg      = [];

        foreach ($sessions as $s) {
            if (empty($s['project']) || empty($s['start_time']) || empty($s['end_time'])) continue;

            $sid   = substr($s['id']    ?? '',            0, 50);
            $proj  = substr($s['project'],               0, 255);
            $dname = substr($s['display_name'] ?? $proj, 0, 255);
            $dur   = max(0, (int)($s['duration_seconds'] ?? 0));
            $st    = (new DateTime($s['start_time']))->format('Y-m-d H:i:s');
            $et    = (new DateTime($s['end_time']))->format('Y-m-d H:i:s');
            // Use IST date sent by extension; fallback derives IST date from UTC start_time (+5:30)
            $date  = $s['date'] ?? (new DateTime($s['start_time']))->modify("+{$tz} minutes")->format('Y-m-d');

            if (!$sid) continue;       // skip if no session_id
            if ($dur < 60) continue;  // skip sessions shorter than 60 seconds

            $stmtSess->execute([
                ':sid'   => $sid,
                ':proj'  => $proj,
                ':dname' => $dname,
                ':st'    => $st,
                ':et'    => $et,
                ':dur'   => $dur,
            ]);

            $key = "$date|$proj";
            if (!isset($agg[$key])) $agg[$key] = ['date' => $date, 'proj' => $proj, 'dname' => $dname];

            $stmtProj->execute([':proj' => $proj, ':dname' => $dname]);
            $inserted++;
        }

        foreach ($agg as $a) {
            $stmtSum->execute([
                ':date'  => $a['date'],
                ':proj'  => $a['proj'],
                ':dname' => $a['dname'],
                ':date2' => $a['date'],
                ':proj2' => $a['proj'],
            ]);
        }

        ok(['inserted' => $inserted, 'message' => "Saved {$inserted} session(s)"]);
    }

    // ── GET endpoints ──────────────────────────────────────────
    elseif ($method === 'GET') {

        // IST date helper (UTC+5:30) — use UTC_TIMESTAMP() to avoid server timezone interference
        $istToday = $pdo->query("SELECT DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL {$tz} MINUTE))")->fetchColumn();

        // dashboard — everything needed for the web UI
        if ($action === 'dashboard' || $action === '') {

            $today = $pdo->prepare("
                SELECT project, display_name, total_seconds,
                       ROUND(total_seconds/3600,2) AS hours, session_count
                FROM daily_summary WHERE summary_date = :today
                ORDER BY total_seconds DESC
            ");
            $today->execute([':today' => $istToday]);
            $today = $today->fetchAll();

            $week = $pdo->prepare("
                SELECT project, display_name,
                       SUM(total_seconds) AS total_seconds,
                       ROUND(SUM(total_seconds)/3600,2) AS hours,
                       SUM(session_count) AS sessions
                FROM daily_summary
                WHERE YEARWEEK(summary_date, 1) = YEARWEEK(:today, 1)
                GROUP BY project, display_name ORDER BY total_seconds DESC
            ");
            $week->execute([':today' => $istToday]);
            $week = $week->fetchAll();

            $daily = $pdo->prepare("
                SELECT summary_date,
                       SUM(total_seconds) AS total_seconds,
                       ROUND(SUM(total_seconds)/3600,2) AS hours
                FROM daily_summary
                WHERE summary_date >= DATE_SUB(:today, INTERVAL 30 DAY)
                GROUP BY summary_date ORDER BY summary_date ASC
            ");
            $daily->execute([':today' => $istToday]);
            $daily = $daily->fetchAll();

            $allTime = $pdo->query("
                SELECT p.project, p.display_name,
                       DATE_FORMAT(DATE_ADD(p.last_seen, INTERVAL {$tz} MINUTE),'%Y-%m-%d') AS last_seen,
                       COALESCE(SUM(ds.total_seconds),0) AS total_seconds,
                       ROUND(COALESCE(SUM(ds.total_seconds),0)/3600,2) AS total_hours,
                       COALESCE(SUM(ds.session_count),0) AS total_sessions
                FROM projects p
                LEFT JOIN daily_summary ds ON ds.project = p.project
                GROUP BY p.project, p.display_name, p.last_seen
                ORDER BY total_seconds DESC
            ")->fetchAll();

            $recent = $pdo->query("
                SELECT project, display_name,
                       DATE_FORMAT(DATE_ADD(start_time, INTERVAL {$tz} MINUTE),'%Y-%m-%d') AS date,
                       DATE_FORMAT(DATE_ADD(start_time, INTERVAL {$tz} MINUTE),'%H:%i') AS start,
                       DATE_FORMAT(DATE_ADD(end_time,   INTERVAL {$tz} MINUTE),'%H:%i') AS end,
                       duration_seconds
                FROM time_sessions
                WHERE duration_seconds >= 60
                ORDER BY start_time DESC LIMIT 200
            ")->fetchAll();

            // Compute streaks from daily_summary (IST dates)
            $activeDates = $pdo->query("
                SELECT DISTINCT summary_date FROM daily_summary
                WHERE total_seconds > 0 ORDER BY summary_date DESC
            ")->fetchAll(PDO::FETCH_COLUMN);

            $currentStreak = 0;
            $longestStreak = 0;
            if ($activeDates) {
                $check = new DateTime($istToday);
                // current streak: count consecutive days ending today or yesterday
                $current = 0;
                $prev = null;
                foreach ($activeDates as $d) {
                    $dt = new DateTime($d);
                    if ($prev === null) {
                        $diff = $check->diff($dt)->days;
                        if ($diff > 1) break;
                        $current = 1;
                    } else {
                        $gap = $prev->diff($dt)->days;
                        if ($gap !== 1) break;
                        $current++;
                    }
                    $prev = $dt;
                }
                $currentStreak = $current;

                // longest streak: scan all active dates ascending
                $asc = array_reverse($activeDates);
                $run = 1; $best = 1;
                for ($i = 1; $i < count($asc); $i++) {
                    $gap = (new DateTime($asc[$i-1]))->diff(new DateTime($asc[$i]))->days;
                    if ($gap === 1) { $run++; if ($run > $best) $best = $run; }
                    else $run = 1;
                }
                $longestStreak = $best;
            }
            $streak = ['current' => $currentStreak, 'longest' => $longestStreak];

            ok(compact('today', 'week', 'daily', 'allTime', 'recent', 'istToday', 'streak'));
        }

        // summary by days
        elseif ($action === 'summary') {
            $days = max(1, min(365, (int)($_GET['days'] ?? 7)));
            $s = $pdo->prepare("
                SELECT summary_date, project, display_name,
                       total_seconds, session_count,
                       ROUND(total_seconds/3600,2) AS hours
                FROM daily_summary
                WHERE summary_date >= DATE_SUB(:today, INTERVAL :d DAY)
                ORDER BY summary_date DESC, total_seconds DESC
            ");
            $s->execute([':today' => $istToday, ':d' => $days]);
            ok(['data' => $s->fetchAll()]);
        }

        // all projects
        elseif ($action === 'projects') {
            $rows = $pdo->query("
                SELECT p.project, p.display_name, p.last_seen,
                       COALESCE(SUM(ds.total_seconds),0) AS total_seconds,
                       ROUND(COALESCE(SUM(ds.total_seconds),0)/3600,2) AS hours
                FROM projects p
                LEFT JOIN daily_summary ds ON ds.project=p.project
                GROUP BY p.project, p.display_name, p.last_seen
                ORDER BY total_seconds DESC
            ")->fetchAll();
            ok(['data' => $rows]);
        }

        // raw sessions
        elseif ($action === 'sessions') {
            $proj  = $_GET['project'] ?? null;
            $limit = max(1, min(500, (int)($_GET['limit'] ?? 50)));
            if ($proj) {
                $s = $pdo->prepare("
                    SELECT project, display_name, duration_seconds,
                           DATE_FORMAT(DATE_ADD(start_time, INTERVAL {$tz} MINUTE),'%Y-%m-%d') AS date,
                           DATE_FORMAT(DATE_ADD(start_time, INTERVAL {$tz} MINUTE),'%H:%i')    AS start,
                           DATE_FORMAT(DATE_ADD(end_time,   INTERVAL {$tz} MINUTE),'%H:%i')    AS end
                    FROM time_sessions WHERE project=:p AND duration_seconds >= 60 ORDER BY start_time DESC LIMIT :l
                ");
                $s->bindValue(':p', $proj);
                $s->bindValue(':l', $limit, PDO::PARAM_INT);
            } else {
                $s = $pdo->prepare("
                    SELECT project, display_name, duration_seconds,
                           DATE_FORMAT(DATE_ADD(start_time, INTERVAL {$tz} MINUTE),'%Y-%m-%d') AS date,
                           DATE_FORMAT(DATE_ADD(start_time, INTERVAL {$tz} MINUTE),'%H:%i')    AS start,
                           DATE_FORMAT(DATE_ADD(end_time,   INTERVAL {$tz} MINUTE),'%H:%i')    AS end
                    FROM time_sessions WHERE duration_seconds >= 60 ORDER BY start_time DESC LIMIT :l
                ");
                $s->bindValue(':l', $limit, PDO::PARAM_INT);
            }
            $s->execute();
            ok(['data' => $s->fetchAll()]);
        } else {
            fail("Unknown action: '$action'");
        }
    } else {
        fail('Method not allowed', 405);
    }
} catch (PDOException $e) {
    fail('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    fail('Server error: ' . $e->getMessage(), 500);
}
