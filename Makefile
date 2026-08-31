.PHONY: help install migrate seed run test test-security test-e2e test-all

help:
	@echo "CodeSpark Makefile Commands:"
	@echo "  make install        Install Python backend dependencies"
	@echo "  make migrate        Run database migrations"
	@echo "  make seed           Seed initial curriculum & demo data"
	@echo "  make run            Start FastAPI development server"
	@echo "  make test           Run acceptance test suite"
	@echo "  make test-e2e       Run production E2E test suite"
	@echo "  make test-security  Run security regression test suite"
	@echo "  make test-all       Run all tests"

install:
	pip install -r backend/requirements.txt

migrate:
	python3 backend/migrate.py upgrade

seed:
	python3 backend/migrate.py seed

run:
	python3 backend/run_server.py

test:
	python3 backend/test_acceptance_suite.py

test-e2e:
	python3 backend/test_production_e2e_suite.py

test-security:
	python3 backend/tests/test_security.py

test-all: test test-e2e test-security
