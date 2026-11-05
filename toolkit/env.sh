# Source this file:  source toolkit/env.sh
# It points everything at the emulator and removes anything that could reach a real account.
_root="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
export AWS_ENDPOINT_URL="http://localhost:5000"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_REGION="us-east-1"
export AWS_EC2_METADATA_DISABLED="true"
export AWS_CONFIG_FILE="$_root/.aws-empty/config"
export AWS_SHARED_CREDENTIALS_FILE="$_root/.aws-empty/credentials"
unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN AWS_IGNORE_CONFIGURED_ENDPOINT_URLS
unset _root
echo "Environment set for the emulator at $AWS_ENDPOINT_URL (fake keys, empty config files)."
