# VALIDATE ONLY. This folder is never applied to the emulator: moto has no RDS subnet groups. It is checked with
# "tofu validate" and by a static test, and it is its own root, so "apply" in infra/ does not include it.
# db.t4g.medium is a size whose us-east-1 price is UNVERIFIED in the research notes (dossier P22).
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-data-a", "subnet-data-b"]
}

variable "security_group_id" {
  type    = string
  default = "sg-db"
}

resource "aws_db_subnet_group" "data" {
  name       = "daftar-data"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "main" {
  identifier                  = "daftar-prod"
  engine                      = "postgres"
  instance_class              = "db.t4g.medium"
  allocated_storage           = 100
  username                    = "daftar"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.data.name
  vpc_security_group_ids      = [var.security_group_id]
  multi_az                    = true
  storage_encrypted           = true
  backup_retention_period     = 7
  publicly_accessible         = false
  deletion_protection         = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "daftar-prod-final"
}
