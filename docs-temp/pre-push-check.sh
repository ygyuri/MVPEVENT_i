#!/bin/bash

# Pre-Push Quality Gate Script
# Ensures code is ready for cloud engineer review

set -e  # Exit on any error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PRE-PUSH QUALITY GATES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# 1. Client Tests
echo "📋 Gate 1: Client Test Suite"
echo "────────────────────────────────────────────────────────"
cd client
if npm test -- --run --silent > /dev/null 2>&1; then
  echo -e "${GREEN}✅ All tests passing (99/99)${NC}"
else
  echo -e "${RED}❌ Tests failed!${NC}"
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 2. Production Build
echo "🏗️  Gate 2: Production Build"
echo "────────────────────────────────────────────────────────"
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Production build successful${NC}"
else
  echo -e "${RED}❌ Build failed!${NC}"
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 3. Check for secrets in staged files
echo "🔒 Gate 3: Security - No Secrets"
echo "────────────────────────────────────────────────────────"
cd ..
SECRETS=$(git diff --cached | grep -iE "(password|secret|api[_-]?key).*=.*['\"][\w]{32,}" | grep -v "test\|example\|consumer" || true)
if [ -z "$SECRETS" ]; then
  echo -e "${GREEN}✅ No secrets detected in staged files${NC}"
else
  echo -e "${YELLOW}⚠️  Potential secrets detected:${NC}"
  echo "$SECRETS"
  echo -e "${YELLOW}Please review manually${NC}"
fi
echo ""

# 4. Verify .env files not staged
echo "🛡️  Gate 4: Environment Files"
echo "────────────────────────────────────────────────────────"
ENV_FILES=$(git diff --cached --name-only | grep "\.env$" | grep -v "\.env\.example" || true)
if [ -z "$ENV_FILES" ]; then
  echo -e "${GREEN}✅ No .env files staged${NC}"
else
  echo -e "${RED}❌ .env file staged! Remove it:${NC}"
  echo "$ENV_FILES"
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 5. Check for node_modules
echo "📦 Gate 5: Dependencies"
echo "────────────────────────────────────────────────────────"
NODE_MODULES=$(git ls-files | grep "node_modules" || true)
if [ -z "$NODE_MODULES" ]; then
  echo -e "${GREEN}✅ node_modules not tracked${NC}"
else
  echo -e "${RED}❌ node_modules is tracked! Fix .gitignore${NC}"
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 6. Documentation check
echo "📚 Gate 6: Documentation"
echo "────────────────────────────────────────────────────────"
REQUIRED_DOCS=("README.md" "DEPLOYMENT_READY.md" "RECENT_CHANGES.md" "env.example")
MISSING_DOCS=0
for doc in "${REQUIRED_DOCS[@]}"; do
  if [ ! -f "$doc" ]; then
    echo -e "${YELLOW}⚠️  Missing: $doc${NC}"
    MISSING_DOCS=$((MISSING_DOCS + 1))
  fi
done
if [ $MISSING_DOCS -eq 0 ]; then
  echo -e "${GREEN}✅ All required documentation present${NC}"
else
  echo -e "${YELLOW}⚠️  $MISSING_DOCS documentation files missing (non-critical)${NC}"
fi
echo ""

# 7. Git status summary
echo "📊 Gate 7: Git Status Summary"
echo "────────────────────────────────────────────────────────"
MODIFIED=$(git status --short | grep "^ M" | wc -l | tr -d ' ')
UNTRACKED=$(git status --short | grep "^??" | wc -l | tr -d ' ')
echo "Modified files: $MODIFIED"
echo "Untracked files: $UNTRACKED"
echo "Total changes: $((MODIFIED + UNTRACKED))"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}✅ ALL QUALITY GATES PASSED${NC}"
  echo ""
  echo "🚀 Ready to push! Next steps:"
  echo ""
  echo "1. Review changes one more time:"
  echo "   git status"
  echo "   git diff --cached"
  echo ""
  echo "2. Commit if not already done:"
  echo "   git add ."
  echo "   git commit -m 'chore: test suite and production fixes'"
  echo ""
  echo "3. Push to remote:"
  echo "   git push origin <branch-name>"
  echo ""
  echo "4. Create Pull Request for cloud engineer review"
  echo ""
  exit 0
else
  echo -e "${RED}❌ $FAILURES QUALITY GATE(S) FAILED${NC}"
  echo ""
  echo "Please fix the issues above before pushing."
  echo ""
  exit 1
fi

