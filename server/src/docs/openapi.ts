export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Agency SLA & Margin Leakage Tracker API",
    version: "1.0.0",
    description: "Production API for HR, recruitment, and staffing agencies to prevent silent margin leakage, monitor contractual SLA deadlines, and balance recruiter workloads.",
    contact: {
      name: "Backend Engineering Team",
      email: "api@agencytracker.io"
    }
  },
  servers: [
    {
      url: "/api/v1",
      description: "Version 1 API Endpoint"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT bearer authorization token"
      }
    },
    schemas: {
      UserRole: {
        type: "string",
        enum: ["OWNER", "MANAGER", "RECRUITER", "FINANCE"]
      },
      BillingModel: {
        type: "string",
        enum: ["RETAINER", "HOURLY", "PER_HIRE"]
      },
      PipelineStage: {
        type: "string",
        enum: [
          "NEW_REQUEST",
          "SOURCING",
          "SCREENING",
          "SHORTLISTING",
          "SHORTLIST_SUBMITTED",
          "INTERVIEW",
          "OFFER",
          "HIRED_FILLED",
          "ON_HOLD",
          "CANCELLED"
        ]
      },
      AlertSeverity: {
        type: "string",
        enum: ["INFO", "WARNING", "CRITICAL"]
      },
      AlertType: {
        type: "string",
        enum: ["AMBER_SLA", "RED_SLA", "LOW_MARGIN", "RECRUITER_OVERLOAD"]
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "owner@agency.io" },
          password: { type: "string", format: "password", example: "Password123!" }
        }
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              role: { $ref: "#/components/schemas/UserRole" },
              organizationId: { type: "string" },
              assignedClientIds: { type: "array", items: { type: "string" } }
            }
          }
        }
      },
      MarginCalculationResult: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientName: { type: "string" },
          clientCode: { type: "string" },
          billingModel: { $ref: "#/components/schemas/BillingModel" },
          periodStart: { type: "string", format: "date-time" },
          periodEnd: { type: "string", format: "date-time" },
          currency: { type: "string" },
          retainerRevenue: { type: "number" },
          hourlyRevenue: { type: "number" },
          perHireRevenue: { type: "number" },
          adjustmentsRevenue: { type: "number" },
          totalRevenue: { type: "number" },
          directCost: { type: "number" },
          directLaborCost: { type: "number" },
          directOtherCost: { type: "number" },
          profit: { type: "number" },
          profitMarginPercentage: { type: "number", nullable: true },
          marginStatus: {
            type: "string",
            enum: ["HEALTHY", "WARNING", "CRITICAL", "NO_REVENUE_DEFICIT", "NO_ACTIVITY"]
          },
          warningThreshold: { type: "number" },
          isBelowThreshold: { type: "boolean" },
          isProvisional: { type: "boolean" },
          unapprovedHours: { type: "number" },
          approvedHours: { type: "number" }
        }
      },
      SlaCalculationResult: {
        type: "object",
        properties: {
          roleId: { type: "string" },
          roleTitle: { type: "string" },
          clientName: { type: "string" },
          recruiterName: { type: "string", nullable: true },
          priority: { type: "string" },
          status: { type: "string" },
          currentStage: { $ref: "#/components/schemas/PipelineStage" },
          totalDurationHours: { type: "number" },
          elapsedDurationHours: { type: "number" },
          remainingDurationHours: { type: "number" },
          consumptionPercentage: { type: "number" },
          slaStatus: {
            type: "string",
            enum: ["ON_TRACK", "AMBER", "RED", "BREACHED", "COMPLETED", "PAUSED"]
          },
          isShortlistMilestoneReached: { type: "boolean" },
          isBreached: { type: "boolean" }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    "/auth/login": {
      post: {
        summary: "Authenticate user and receive JWT session token",
        tags: ["Authentication"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Authentication successful",
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } }
          },
          "401": {
            description: "Invalid credentials",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/auth/me": {
      get: {
        summary: "Get current authenticated user session profile",
        tags: ["Authentication"],
        responses: {
          "200": { description: "Session details returned" }
        }
      }
    },
    "/margins/summary": {
      get: {
        summary: "Retrieve agency-wide margin and revenue telemetry summary",
        tags: ["Financial & Margins"],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } }
        ],
        responses: {
          "200": { description: "Financial KPI summary returned" },
          "403": { description: "Forbidden for Recruiters" }
        }
      }
    },
    "/margins/clients": {
      get: {
        summary: "List all clients margin calculations with sorting and filtering",
        tags: ["Financial & Margins"],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["margin", "revenue", "profit", "cost"] } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } }
        ],
        responses: {
          "200": {
            description: "List of client margin results",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MarginCalculationResult" } } } }
          }
        }
      }
    },
    "/margins/clients/{id}/drilldown": {
      get: {
        summary: "Retrieve detailed labor cost and underlying time entries for a client",
        tags: ["Financial & Margins"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } }
        ],
        responses: {
          "200": { description: "Client margin breakdown and labor records returned" }
        }
      }
    },
    "/sla/summary": {
      get: {
        summary: "Get contractual SLA clocks summary across all active roles",
        tags: ["SLA Clock & Risk Engine"],
        responses: {
          "200": {
            description: "SLA summary with active role clocks and risk counts"
          }
        }
      }
    },
    "/sla/recalculate": {
      post: {
        summary: "Trigger re-evaluation of all SLA clocks and scan for new risk alerts",
        tags: ["SLA Clock & Risk Engine"],
        responses: {
          "200": { description: "Recalculation and alert scan completed" }
        }
      }
    },
    "/workload/overview": {
      get: {
        summary: "Get recruiter capacity utilization, active search counts, and overload status",
        tags: ["Recruiter Workload Engine"],
        responses: {
          "200": { description: "Workload balancer metrics returned" }
        }
      }
    },
    "/workload/reassign": {
      post: {
        summary: "Reassign recruitment search to another recruiter with audit log",
        tags: ["Recruiter Workload Engine"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["roleId", "newRecruiterId"],
                properties: {
                  roleId: { type: "string" },
                  newRecruiterId: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Role successfully reassigned" }
        }
      }
    },
    "/alerts": {
      get: {
        summary: "List alerts with status and type filters",
        tags: ["Alert Center"],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "RESOLVED"] } },
          { name: "type", in: "query", schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "List of active or resolved alerts" }
        }
      }
    },
    "/alerts/{id}/resolve": {
      post: {
        summary: "Resolve an alert with required resolution notes",
        tags: ["Alert Center"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resolutionNotes"],
                properties: { resolutionNotes: { type: "string" } }
              }
            }
          }
        },
        responses: {
          "200": { description: "Alert marked as resolved" }
        }
      }
    },
    "/billing/invoices": {
      get: {
        summary: "List invoices with client and status filters",
        tags: ["Billing & Reconciliation"],
        responses: { "200": { description: "Invoices list returned" } }
      },
      post: {
        summary: "Generate an invoice for recognized or retainer revenue",
        tags: ["Billing & Reconciliation"],
        responses: { "201": { description: "Invoice issued" } }
      }
    },
    "/billing/reconciliation": {
      get: {
        summary: "Compare recognized operational revenue against issued invoices",
        tags: ["Billing & Reconciliation"],
        responses: { "200": { description: "Reconciliation table returned" } }
      }
    },
    "/csv/templates/{type}": {
      get: {
        summary: "Download CSV template headers for batch ingestion",
        tags: ["CSV Import & Export"],
        parameters: [{ name: "type", in: "path", required: true, schema: { type: "string", enum: ["clients", "recruiters", "roles", "time-entries"] } }],
        responses: { "200": { description: "CSV template file returned" } }
      }
    },
    "/csv/preview/{type}": {
      post: {
        summary: "Perform dry-run parsing and validation on CSV upload",
        tags: ["CSV Import & Export"],
        responses: { "200": { description: "Validation preview with row-level error diagnosis" } }
      }
    },
    "/csv/execute/{type}": {
      post: {
        summary: "Execute transactional batch database ingestion of validated CSV",
        tags: ["CSV Import & Export"],
        responses: { "200": { description: "Ingestion completed" } }
      }
    },
    "/reports/weekly": {
      get: {
        summary: "Compile executive weekly management summary digest",
        tags: ["Reports & Summary"],
        responses: { "200": { description: "Weekly summary compiled" } }
      }
    },
    "/reports/weekly/send": {
      post: {
        summary: "Dispatch executive weekly digest via email",
        tags: ["Reports & Summary"],
        responses: { "200": { description: "Email digest dispatched" } }
      }
    },
    "/audit-logs": {
      get: {
        summary: "Fetch audited operational, contractual, and financial event log",
        tags: ["Audit Trail"],
        parameters: [
          { name: "entityType", in: "query", schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } }
        ],
        responses: { "200": { description: "Audit trail log records returned" } }
      }
    }
  }
};
