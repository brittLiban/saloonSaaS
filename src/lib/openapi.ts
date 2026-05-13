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
    title: "Paw Reception API",
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
          { name: "serviceId", in: "query", required: false, schema: { type: "string" } },
          { name: "serviceIds", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated service IDs for multi-service bookings." },
          { name: "addOnIds", in: "query", required: false, schema: { type: "string" }, description: "Comma-separated add-on IDs." },
          { name: "durationMinutes", in: "query", required: false, schema: { type: "integer" }, description: "Optional n8n-calculated duration override." },
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } },
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  serviceId: { type: "string" },
                  serviceIds: { type: "array", items: { type: "string" } },
                  addOnIds: { type: "array", items: { type: "string" } },
                  addOns: { type: "array", items: { type: "string" }, description: "Add-on names/slugs accepted for n8n convenience." },
                  clientId: { type: "string" },
                  animalId: { type: "string" },
                  startsAt: { type: "string", format: "date-time" },
                  durationMinutes: { type: "integer" },
                  priceCents: { type: "integer" },
                },
                required: ["clientId", "animalId", "startsAt"],
              },
            },
          },
        },
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
