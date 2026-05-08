export type TimeWindow = {
  startsAt: Date;
  endsAt: Date;
};

export type AvailabilityInput = {
  from: Date;
  to: Date;
  slotMinutes: number;
  stepMinutes?: number;
  openWindows: TimeWindow[];
  busyWindows: TimeWindow[];
};

export type AvailabilitySlot = {
  startsAt: Date;
  endsAt: Date;
};

export function computeAvailability(input: AvailabilityInput): AvailabilitySlot[] {
  const stepMinutes = input.stepMinutes ?? 15;
  const slots: AvailabilitySlot[] = [];

  for (const openWindow of input.openWindows) {
    const firstStart = maxDate(openWindow.startsAt, input.from);
    const lastEnd = minDate(openWindow.endsAt, input.to);

    for (
      let cursor = firstStart;
      addMinutes(cursor, input.slotMinutes) <= lastEnd;
      cursor = addMinutes(cursor, stepMinutes)
    ) {
      const candidate = {
        startsAt: cursor,
        endsAt: addMinutes(cursor, input.slotMinutes),
      };

      if (!input.busyWindows.some((busy) => overlaps(candidate, busy))) {
        slots.push(candidate);
      }
    }
  }

  return slots;
}

export function overlaps(a: TimeWindow, b: TimeWindow) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function maxDate(a: Date, b: Date) {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date) {
  return a < b ? a : b;
}
