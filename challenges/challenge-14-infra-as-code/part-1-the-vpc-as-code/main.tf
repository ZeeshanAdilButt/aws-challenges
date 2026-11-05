# The Daftar network from challenge 4, as code. Same six address blocks, same three route tables.

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags       = { Name = var.name }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.name}-igw" }
}

resource "aws_subnet" "app_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.0.0/22"
  availability_zone = "us-east-1a"
  tags              = { Name = "app-a" }
}

resource "aws_subnet" "app_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.4.0/22"
  availability_zone = "us-east-1b"
  tags              = { Name = "app-b" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.8.0/24"
  availability_zone = "us-east-1a"
  tags              = { Name = "public-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.9.0/24"
  availability_zone = "us-east-1b"
  tags              = { Name = "public-b" }
}

resource "aws_subnet" "data_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.10.0/26"
  availability_zone = "us-east-1a"
  tags              = { Name = "data-a" }
}

resource "aws_subnet" "data_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.10.64/26"
  availability_zone = "us-east-1b"
  tags              = { Name = "data-b" }
}

# YOUR TURN start
# HINT: a route table is { vpc_id }. A route is { route_table_id, destination_cidr_block, gateway_id } or { ..., nat_gateway_id }.
# HINT: aws_route_table_association ties one subnet to one table. The NAT gateway needs an aws_eip (domain = "vpc") and sits in public_a.
# HINT: rt_data has NO internet route. That is the point: the database cannot reach out.
# YOUR TURN end
