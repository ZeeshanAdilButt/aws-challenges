# What the code says about the database security group. Only the two app subnets may reach port 5432.
#
# You apply this file with the wrapper (node ../../../toolkit/tofu.js apply), so OpenTofu creates the VPC and the group
# and records both in its state. The drill then changes that same group by hand with drift.mjs, so the next plan can see it.
# (The tests do not start OpenTofu. They build a stand-in group with the SDK and compare it with the course plan model.)
resource "aws_vpc" "main" {
  cidr_block = "10.20.0.0/16"

  tags = {
    Name = "daftar-drift-drill"
  }
}

resource "aws_security_group" "db" {
  name        = "daftar-db"
  description = "The Daftar database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.20.0.0/22", "10.20.4.0/22"]
  }
}
