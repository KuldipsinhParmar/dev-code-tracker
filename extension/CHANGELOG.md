# Changelog

## [1.1.3] — 2026-06-01
- Fixed scrollbar appearing on the navigation tab bar
- Fixed Daily Activity Panel showing current calendar week instead of last 7 rolling days when "7d" is selected

## [1.1.1] — 2026-05-29
- Fixed demo GIF and icon not displaying on VS Code Marketplace (replaced relative paths with absolute GitHub raw URLs)

## [1.1.0] — 2026-05-29
- Improved Marketplace README with demo GIF slot, "Why Dev Code Tracker?" comparison, and cleaner layout
- Added review prompt — appears after session milestones (5, 15, 30) with one-click link to Marketplace rating page
- Expanded search keywords for better Marketplace discoverability
- Updated extension description to lead with privacy and zero-config angle

## [1.0.0] — 2026-05-23
- 🎉 **Initial Release of Dev Code Tracker**
- Automatically tracks coding time per project with zero configuration
- Real-time status bar timer — counts every second while you code
- Smart idle detection — session ends automatically after N minutes of inactivity (default 5 min)
- Midnight-safe sessions — splits correctly at day boundary
- Local-first architecture — all data saved to `.devCodeTracker/sessions.json` in your project folder
- Optional online sync to self-hosted PHP + MySQL server
- Offline HTML dashboard with bar charts, daily breakdown, and session table
- Web dashboard for Online mode with full history and project comparison
- Project display name customization
- Works with VS Code, Cursor AI, and Claude Code
- No accounts, no telemetry, no cloud lock-in
- New glowing blue clock + code eye logo
