# Agentic SDD Workflow — Definitions

## Agentic SDD Workflow

A multi-agent software development workflow based on Spec-Driven Development. Agents coordinate through repository documents, not private memory.

## Spec-Driven Development

A development approach where implementation is derived from an approved functional specification, acceptance criteria, technical specification and test plan.

## Feature

A new user-facing or system capability delivered through the initial workflow scope.

## Human

The final product owner and decision maker. The human interacts only with Gemini.

## Context Pack

A handoff section in `status.md` prepared by one agent for the next agent. It defines the minimum required context for the next phase.

## Acceptance Criterion

A testable statement describing behavior that must be true for the feature to be accepted. Every acceptance criterion must map to tests in `test_plan.md`.

## Blocking Ambiguity

Any missing, contradictory or unclear information that prevents safe progress without risk of incorrect implementation, scope drift, security issue, legal issue, cost impact or failed validation.

## Clarification Loop

A question-and-answer loop before a deliverable is produced. Clarification loops do not count against correction loop limits.

## Correction Loop

A loop after a deliverable has been produced and rejected. Correction loops are limited.

## Definition of Done

The mandatory checklist required before Gemini may create a Pull Request.

## Feature Preflight

Gemini’s check for overlapping or conflicting features before branch creation.

## Historical Feature Documentation

Past feature folders under `docs/features/`. Preserved permanently but not read by default.

## Sensitive Decision

Any decision involving cost, security, legal/compliance, permissions, functional scope, significant architecture, accepted technical debt, reduced testing, failed checks, cancellation or merge.
