# Three roles, three small policies. The policy text lives in policies/*.json, so the same file is used by OpenTofu
# and by the policy model in part 2 (the test that proves them).
# YOUR TURN start
# HINT: a role needs a trust policy (assume_role_policy) that names who may use it: ecs-tasks.amazonaws.com or lambda.amazonaws.com.
# HINT: file("${path.module}/policies/task-role.json") reads a JSON file into the policy argument.
# YOUR TURN end
