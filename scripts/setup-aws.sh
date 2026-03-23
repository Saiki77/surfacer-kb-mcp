#!/usr/bin/env bash
set -euo pipefail

# Shared Knowledge Base - AWS Setup Script
# Run this once to create the S3 bucket and Bedrock Knowledge Base.

REGION="${KB_AWS_REGION:-us-east-1}"
PROFILE="${KB_AWS_PROFILE:-default}"
BUCKET_NAME="${KB_S3_BUCKET:-}"
KB_PREFIX="${KB_S3_PREFIX:-knowledge-base/}"

echo "=== Shared Knowledge Base - AWS Setup ==="
echo ""

# Prompt for bucket name if not set
if [ -z "$BUCKET_NAME" ]; then
  read -rp "Enter S3 bucket name (must be globally unique): " BUCKET_NAME
fi

echo "Region:  $REGION"
echo "Profile: $PROFILE"
echo "Bucket:  $BUCKET_NAME"
echo "Prefix:  $KB_PREFIX"
echo ""

# Step 1: Create S3 bucket
echo "--- Step 1: Creating S3 bucket ---"
if aws s3api head-bucket --bucket "$BUCKET_NAME" --profile "$PROFILE" --region "$REGION" 2>/dev/null; then
  echo "Bucket '$BUCKET_NAME' already exists."
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --create-bucket-configuration LocationConstraint="$REGION"
  echo "Created bucket '$BUCKET_NAME'."
fi

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled \
  --profile "$PROFILE" \
  --region "$REGION"
echo "Enabled versioning on bucket."

# Create initial folder structure
for folder in decisions architecture processes meeting-notes context; do
  aws s3api put-object \
    --bucket "$BUCKET_NAME" \
    --key "${KB_PREFIX}${folder}/" \
    --profile "$PROFILE" \
    --region "$REGION" \
    > /dev/null
done
echo "Created folder structure under '${KB_PREFIX}'."
echo ""

# Step 2: Create Bedrock Knowledge Base
echo "--- Step 2: Creating Bedrock Knowledge Base ---"
echo ""
echo "NOTE: Bedrock Knowledge Base setup requires additional IAM roles and"
echo "permissions. The following steps use the AWS Console or CLI."
echo ""
echo "To set up the Bedrock Knowledge Base:"
echo ""
echo "  1. Go to AWS Console > Amazon Bedrock > Knowledge Bases"
echo "  2. Click 'Create knowledge base'"
echo "  3. Name: 'shared-knowledge-base'"
echo "  4. Select embedding model: Amazon Titan Text Embeddings V2"
echo "  5. Select vector store: Amazon S3 Vectors (recommended) or Quick create"
echo "  6. Add data source:"
echo "     - Type: Amazon S3"
echo "     - Bucket: s3://${BUCKET_NAME}"
echo "     - Prefix: ${KB_PREFIX}"
echo "  7. Chunking strategy: Semantic chunking"
echo "  8. Click 'Create' and wait for the knowledge base to be ready"
echo "  9. Click 'Sync' to index your documents"
echo ""
echo "After creation, note down:"
echo "  - Knowledge Base ID (e.g., ABCDEF1234)"
echo "  - Data Source ID (e.g., GHIJKL5678)"
echo ""

# Step 3: Output configuration
echo "--- Step 3: Configuration ---"
echo ""
echo "Add these to your shell profile (~/.zshrc or ~/.bashrc) or set them"
echo "in the .mcp.json env block:"
echo ""
echo "  export KB_S3_BUCKET=\"$BUCKET_NAME\""
echo "  export KB_AWS_REGION=\"$REGION\""
echo "  export KB_AWS_PROFILE=\"$PROFILE\""
echo "  export KB_S3_PREFIX=\"$KB_PREFIX\""
echo "  export KB_BEDROCK_KB_ID=\"<your-knowledge-base-id>\""
echo "  export KB_DATA_SOURCE_ID=\"<your-data-source-id>\""
echo ""
echo "Then install the plugin in Claude Code:"
echo "  claude plugin add /path/to/knowledge-base-plugin"
echo ""
echo "=== Setup complete! ==="
