# The capstone network: the Daftar VPC of challenge 4 (same six blocks), two zones, three layers.
locals {
  subnets = {
    app_a    = { cidr = "10.20.0.0/22", az = "us-east-1a", tier = "app" }
    app_b    = { cidr = "10.20.4.0/22", az = "us-east-1b", tier = "app" }
    public_a = { cidr = "10.20.8.0/24", az = "us-east-1a", tier = "public" }
    public_b = { cidr = "10.20.9.0/24", az = "us-east-1b", tier = "public" }
    data_a   = { cidr = "10.20.10.0/26", az = "us-east-1a", tier = "data" }
    data_b   = { cidr = "10.20.10.64/26", az = "us-east-1b", tier = "data" }
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.20.0.0/16"
  tags       = { Name = var.name, team = "platform", env = "prod", service = "network" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "all" {
  for_each          = local.subnets
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
  tags              = { Name = each.key, tier = each.value.tier }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "a" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.all["public_a"].id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table" "app" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.a.id
  }
}

# The data tables have no internet route at all.
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.main.id
}

# Security groups: the load balancer takes the internet on 443, the app takes only the load balancer on 8080,
# the database takes only the app on 5432.
resource "aws_security_group" "alb" {
  name   = "daftar-alb"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "app" {
  name   = "daftar-app"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "db" {
  name   = "daftar-db"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "alb_to_app" {
  security_group_id            = aws_security_group.alb.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}

resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_egress_rule" "app_to_db" {
  security_group_id            = aws_security_group.app.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.db.id
}

resource "aws_vpc_security_group_egress_rule" "app_to_internet" {
  security_group_id = aws_security_group.app.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}
