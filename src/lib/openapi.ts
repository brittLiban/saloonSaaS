export const webhookEvents = [
  "appointment.created",
  "appointment.rescheduled",
  "appointment.cancelled",
  "appointment.status_changed",
  "client.created",
  "animal.created",
  "note.created",
  "invoice.created",
  "invoice.status_changed",
  "rebooking.due",
];

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Glasshound API",
    version: "0.1.0",
    description: "Planned n8n-ready API for the multi-tenant pet salon SaaS.",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Tenant-scoped API key. Stored hashed server-side.",
      },
    },
  },
  paths: {
    "/me": {
      get: {
        summary: "Read current tenant/API context",
        responses: {
          "200": { description: "Current API key context" },
        },
      },
    },
    "/availability": {
      get: {
        summary: "Read bookable appointment slots",
        parameters: [
          { name: "serviceId", in: "query", required: true, schema: { type: "string" } },
          { name: "from", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          { name: "staffId", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Available slots" },
        },
      },
    },
    "/appointments": {
      get: {
        summary: "List appointments",
        responses: { "200": { description: "Appointments" } },
      },
      post: {
        summary: "Create appointment",
        responses: { "201": { description: "Appointment created" } },
      },
    },
    "/appointments/{id}/cancel": {
      post: {
        summary: "Cancel appointment",
        responses: { "200": { description: "Appointment cancelled" } },
      },
    },
    "/appointments/{id}/reschedule": {
      post: {
        summary: "Reschedule appointment",
        responses: { "200": { description: "Appointment rescheduled" } },
      },
    },
    "/appointments/{id}/status": {
      post: {
        summary: "Change appointment status",
        responses: { "200": { description: "Appointment status changed" } },
      },
    },
  },
};
