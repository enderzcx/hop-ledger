# OpenClaw Blind Handoff Scorecard

Use this scorecard when an external team integrates HopLedger without direct maintainer support.

## Session Metadata

- Date:
- Integrator team:
- Runtime version:
- Contact:
- Repository/branch:

## Acceptance Tasks

<table header-row="true">
<tr>
<td>ID</td>
<td>Task</td>
<td>Expected Outcome</td>
<td>Status</td>
<td>Notes</td>
</tr>
<tr>
<td>B1</td>
<td>Install and build</td>
<td>`npm install` and `npm run build` pass</td>
<td>Pending</td>
<td></td>
</tr>
<tr>
<td>B2</td>
<td>Skill env bootstrap</td>
<td>`docs/openclaw-skill.env.example` can be applied without ambiguity</td>
<td>Pending</td>
<td></td>
</tr>
<tr>
<td>B3</td>
<td>Pilot execution</td>
<td>`npm run pilot:openclaw` produces artifact folder under `artifacts/pilot/`</td>
<td>Pending</td>
<td></td>
</tr>
<tr>
<td>B4</td>
<td>CLI verification</td>
<td>`verify-run` returns digest match and zero failed envelopes</td>
<td>Pending</td>
<td></td>
</tr>
<tr>
<td>B5</td>
<td>API verification</td>
<td>`POST /verify/run` returns `verificationPassed=true`</td>
<td>Pending</td>
<td></td>
</tr>
<tr>
<td>B6</td>
<td>Digest parity (optional)</td>
<td>`npm run parity:kite -- --artifact <path>` returns all `match=true`</td>
<td>Pending</td>
<td></td>
</tr>
</table>

## Output Checklist

- Artifact folder path:
- `traceId`:
- `requestId`:
- `taskId`:
- `runDigest`:
- `verificationPassed`:
- Blockers:

## Scoring

- Pass criteria:
  - B1-B5 all `Done`
  - no unresolved blocker in output checklist
- Stretch:
  - B6 `Done`
  - external team can repeat run in fresh terminal session
