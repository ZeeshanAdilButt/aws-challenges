# The API on ECS (Fargate), the job worker as a function, and the log group.
resource "aws_cloudwatch_log_group" "api" {
  name              = "/daftar/api"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "main" {
  name = "daftar"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "daftar-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([{
    name         = "api"
    image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/daftar-api:1.4.2"
    essential    = true
    portMappings = [{ containerPort = 8080 }]
    logConfiguration = {
      logDriver = "awslogs"
      options   = { "awslogs-group" = "/daftar/api", "awslogs-region" = "us-east-1", "awslogs-stream-prefix" = "api" }
    }
  }])
}

resource "aws_ecs_service" "api" {
  name            = "daftar-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets         = [aws_subnet.all["app_a"].id, aws_subnet.all["app_b"].id]
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_lambda_function" "worker" {
  function_name = "daftar-worker"
  role          = aws_iam_role.worker_function.arn
  package_type  = "Image"
  image_uri     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/daftar-worker:1.0.0"
  timeout       = 30
}

resource "aws_lambda_event_source_mapping" "jobs" {
  event_source_arn = aws_sqs_queue.jobs.arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = 5
}
