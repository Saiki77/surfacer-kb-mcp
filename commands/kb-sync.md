---
description: Trigger a sync of the Bedrock Knowledge Base to index new/updated documents
allowed-tools: [Bash]
---

# Knowledge Base Sync

Trigger a Bedrock Knowledge Base ingestion job to re-index documents after writing or deleting.

Run the following AWS CLI command to start the sync:

```bash
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_BEDROCK_KB_ID" \
  --data-source-id "$KB_DATA_SOURCE_ID" \
  --region "${KB_AWS_REGION:-eu-central-1}" \
  --profile "${KB_AWS_PROFILE:-default}"
```

If `KB_BEDROCK_KB_ID` or `KB_DATA_SOURCE_ID` are not set, inform the user they need to configure these environment variables first by running the setup script.

After starting the job, check its status and report back to the user.
