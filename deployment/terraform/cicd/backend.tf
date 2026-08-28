terraform {
  backend "gcs" {
    bucket = "capstone-cicd-terraform-state"
    prefix = "version1/prod"
  }
}
