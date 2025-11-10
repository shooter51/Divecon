#!/bin/bash

# Elite Adventures Belize - Pre-Deployment Verification Script
# Checks that all required files and dependencies are in place

echo "🔍 Pre-Deployment Verification"
echo "==============================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    ((ERRORS++))
  fi
}

check_command() {
  if command -v "$1" &> /dev/null; then
    VERSION=$($1 --version 2>&1 | head -n1)
    echo -e "${GREEN}✓${NC} $1 ($VERSION)"
  else
    echo -e "${RED}✗${NC} $1 (NOT INSTALLED)"
    ((ERRORS++))
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${YELLOW}⚠${NC} $1 (MISSING - will be created)"
    ((WARNINGS++))
  fi
}

echo "Prerequisites:"
echo "--------------"
check_command aws
check_command terraform
check_command node
check_command npm
echo ""

echo "AWS Credentials:"
echo "----------------"
if aws sts get-caller-identity &> /dev/null; then
  ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
  REGION=$(aws configure get region)
  echo -e "${GREEN}✓${NC} AWS credentials valid"
  echo "  Account: $ACCOUNT"
  echo "  Region: ${REGION:-us-east-1 (default)}"
else
  echo -e "${RED}✗${NC} AWS credentials not configured"
  echo "  Run: aws configure"
  ((ERRORS++))
fi
echo ""

echo "Core Configuration Files:"
echo "-------------------------"
check_file ".env.sample"
check_file ".gitignore"
check_file "README.md"
check_file "DEPLOYMENT.md"
echo ""

echo "Frontend Files:"
echo "---------------"
check_file "app/package.json"
check_file "app/build.js"
check_file "app/public/index.html"
check_file "app/public/manifest.json"
check_file "app/public/sw.js"
check_file "app/src/index.js"
echo ""

echo "Lambda Functions:"
echo "-----------------"
check_file "lambdas/leads/index.js"
check_file "lambdas/leads/package.json"
check_file "lambdas/exports/index.js"
check_file "lambdas/exports/package.json"
check_file "lambdas/conference/index.js"
check_file "lambdas/conference/package.json"
echo ""

echo "Terraform Files:"
echo "----------------"
check_file "infra/terraform/main.tf"
check_file "infra/terraform/providers.tf"
check_file "infra/terraform/variables.tf"
check_file "infra/terraform/outputs.tf"
check_file "infra/terraform/s3_site.tf"
check_file "infra/terraform/ddb.tf"
check_file "infra/terraform/cognito.tf"
check_file "infra/terraform/iam.tf"
check_file "infra/terraform/lambdas.tf"
check_file "infra/terraform/apigw.tf"
check_file "infra/terraform/waf.tf"
echo ""

echo "Scripts:"
echo "--------"
check_file "scripts/deploy.sh"
check_file "scripts/seed.sh"
check_file "scripts/test-api.sh"
check_file "scripts/verify.sh"

# Check script permissions
for script in scripts/*.sh; do
  if [ -x "$script" ]; then
    echo -e "${GREEN}✓${NC} $script (executable)"
  else
    echo -e "${YELLOW}⚠${NC} $script (not executable - run: chmod +x $script)"
    ((WARNINGS++))
  fi
done
echo ""

echo "Documentation:"
echo "--------------"
check_file "docs/README.md"
check_file "docs/OPERATIONS.md"
echo ""

echo "Environment Configuration:"
echo "--------------------------"
if [ -f ".env" ]; then
  echo -e "${GREEN}✓${NC} .env file exists"

  # Check for required variables
  if grep -q "AWS_REGION=" .env; then
    REGION=$(grep "AWS_REGION=" .env | cut -d'=' -f2)
    echo "  AWS_REGION: $REGION"
  else
    echo -e "${YELLOW}⚠${NC} AWS_REGION not set in .env"
    ((WARNINGS++))
  fi

  if grep -q "PROJECT_NAME=" .env; then
    PROJECT=$(grep "PROJECT_NAME=" .env | cut -d'=' -f2)
    echo "  PROJECT_NAME: $PROJECT"
  else
    echo -e "${YELLOW}⚠${NC} PROJECT_NAME not set in .env"
    ((WARNINGS++))
  fi
else
  echo -e "${YELLOW}⚠${NC} .env file not found"
  echo "  Run: cp .env.sample .env"
  echo "  Then edit .env with your settings"
  ((WARNINGS++))
fi
echo ""

echo "==============================="
echo "Verification Summary:"
echo "==============================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Ready to deploy! Run:"
  echo "  ./scripts/deploy.sh"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
  echo ""
  echo "You can proceed with deployment, but review warnings above."
  echo ""
  echo "To deploy:"
  echo "  ./scripts/deploy.sh"
  echo ""
  exit 0
else
  echo -e "${RED}✗ $ERRORS error(s) found${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
  fi
  echo ""
  echo "Fix the errors above before deploying."
  echo ""
  exit 1
fi
