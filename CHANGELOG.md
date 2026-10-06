# Changelog

All notable changes to Elikonas are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

## [1.1.0] - 2026-10-05

### Added
- Profile photo upload, replace, and remove, with a privacy toggle ("Show my photo to others," off by default) controlling visibility to other users. Photos are auto-oriented, cropped, re-encoded as WebP, and stripped of EXIF/GPS metadata on upload. Wired into every surface that renders a user's identity: own profile, public profile, people search, musings, groups, tidings, and nav.
- Proof-of-completion file upload for ed-units (credentials), plus replace and delete for an existing proof file.
- Course URL and completion date fields on ed-units. The course link is now displayed on the learning record (previously captured but never shown).

### Changed
- Credential file links now resolve through a freshly generated signed URL on every click instead of one baked in at render time.
- Refactored avatar/initials rendering into a single shared component used across profile, people, musings, groups, and tidings (no visible change).

### Fixed
- Credential file links breaking with "InvalidJWT / exp claim expired" once the originally-generated signed URL's TTL elapsed.

## [1.0.0] - 2026-08-28

### Added
- Alpha launch of elikonas.com
- Eli, the AI learning guide
- Learner profile and portable learning record
- Founding member program (alpha free tier, premium lifetime tier)
