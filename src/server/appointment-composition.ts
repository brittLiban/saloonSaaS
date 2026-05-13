import { db } from "@/server/db";

export type AppointmentCompositionInput = {
  tenantId: string;
  serviceId?: string;
  serviceIds?: string[];
  addOnIds?: string[];
  addOns?: string[];
  durationMinutes?: number;
  priceCents?: number;
};

type ServiceLine = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

type AddOnLine = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export async function resolveAppointmentComposition(input: AppointmentCompositionInput): Promise<{
  primaryService: ServiceLine;
  services: ServiceLine[];
  addOns: AddOnLine[];
  durationMinutes: number;
  priceCents: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}> {
  const serviceIds = unique([...(input.serviceIds ?? []), ...(input.serviceId ? [input.serviceId] : [])]);
  if (serviceIds.length === 0) throw new Error("At least one service is required.");

  const services = await db.service.findMany({
    where: { tenantId: input.tenantId, id: { in: serviceIds }, active: true },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      priceCents: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
    },
  });

  if (services.length !== serviceIds.length) {
    throw new Error("One or more services were not found or are inactive.");
  }

  const orderedServices = serviceIds.map((id) => {
    const service = services.find((s) => s.id === id);
    if (!service) throw new Error("One or more services were not found or are inactive.");
    return service;
  });

  const addOnTokens = unique([...(input.addOnIds ?? []), ...(input.addOns ?? [])]);
  const addOns = addOnTokens.length > 0
    ? await db.addOn.findMany({
        where: { tenantId: input.tenantId, active: true },
        include: { serviceLinks: { select: { serviceId: true } } },
      })
    : [];

  const orderedAddOns = addOnTokens.map((token) => {
    const normalized = slug(token);
    const addOn = addOns.find((candidate) => candidate.id === token || slug(candidate.name) === normalized);
    if (!addOn) throw new Error(`Add-on not found or inactive: ${token}`);

    const allowedServiceIds = addOn.serviceLinks.map((link) => link.serviceId);
    const allowed = allowedServiceIds.length === 0 || orderedServices.some((service) => allowedServiceIds.includes(service.id));
    if (!allowed) throw new Error(`${addOn.name} cannot be used with the selected service.`);

    return {
      id: addOn.id,
      name: addOn.name,
      durationMinutes: addOn.durationMinutes,
      priceCents: addOn.priceCents,
    };
  });

  const calculatedDuration = [
    ...orderedServices.map((service) => service.durationMinutes),
    ...orderedAddOns.map((addOn) => addOn.durationMinutes),
  ].reduce((sum, minutes) => sum + minutes, 0);

  const calculatedPrice = [
    ...orderedServices.map((service) => service.priceCents),
    ...orderedAddOns.map((addOn) => addOn.priceCents),
  ].reduce((sum, cents) => sum + cents, 0);

  return {
    primaryService: orderedServices[0],
    services: orderedServices,
    addOns: orderedAddOns,
    durationMinutes: input.durationMinutes ?? calculatedDuration,
    priceCents: input.priceCents ?? calculatedPrice,
    bufferBeforeMinutes: Math.max(...orderedServices.map((service) => service.bufferBeforeMinutes)),
    bufferAfterMinutes: Math.max(...orderedServices.map((service) => service.bufferAfterMinutes)),
  };
}

export function appointmentLineCreates(composition: Awaited<ReturnType<typeof resolveAppointmentComposition>>) {
  return {
    services: {
      create: composition.services.map((service, index) => ({
        serviceId: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        sortOrder: index,
      })),
    },
    addOns: {
      create: composition.addOns.map((addOn, index) => ({
        addOnId: addOn.id,
        name: addOn.name,
        durationMinutes: addOn.durationMinutes,
        priceCents: addOn.priceCents,
        sortOrder: index,
      })),
    },
  };
}
