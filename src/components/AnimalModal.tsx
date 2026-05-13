"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertAnimal } from "@/server/actions/animals";
import { Overlay, Field } from "./ClientModal";

export type AnimalFormData = {
  id?: string;
  clientId: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  dateOfBirth: Date | null;
  weightLbs: number | null;
  vaccinated: boolean | null;
  allergies: string[];
  behaviorFlags: string[];
  preferredCadenceDays: number | null;
  careSummary: string | null;
};

export function AnimalModal({
  animal,
  clientId,
  onClose,
}: {
  animal: AnimalFormData | null;
  clientId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName]       = useState(animal?.name ?? "");
  const [species, setSpecies] = useState(animal?.species ?? "Dog");
  const [breed, setBreed]     = useState(animal?.breed ?? "");
  const [sex, setSex]         = useState(animal?.sex ?? "unknown");
  const [weight, setWeight]   = useState(animal?.weightLbs != null ? String(animal.weightLbs) : "");
  const [vaccinated, setVaccinated] = useState(animal?.vaccinated == null ? "unknown" : animal.vaccinated ? "yes" : "no");
  const [cadence, setCadence] = useState(animal?.preferredCadenceDays != null ? String(animal.preferredCadenceDays) : "");
  const [summary, setSummary] = useState(animal?.careSummary ?? "");

  const [allergies, setAllergies]     = useState<string[]>(animal?.allergies ?? []);
  const [allergyInput, setAllergyInput] = useState("");
  const [flags, setFlags]             = useState<string[]>(animal?.behaviorFlags ?? []);
  const [flagInput, setFlagInput]     = useState("");

  function addTag(list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) {
    const val = input.trim();
    if (val && !list.includes(val)) setList([...list, val]);
    setInput("");
  }

  function removeTag(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.filter((t) => t !== tag));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertAnimal({
          id: animal?.id,
          clientId,
          name, species,
          breed: breed || undefined,
          sex: sex as "male" | "female" | "unknown",
          weightLbs: weight ? Number(weight) : undefined,
          vaccinated: vaccinated === "unknown" ? null : vaccinated === "yes",
          preferredCadenceDays: cadence ? Number(cadence) : undefined,
          careSummary: summary || undefined,
          allergies,
          behaviorFlags: flags,
        });
        onClose();
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontFamily: "var(--dash-sans)", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
        {animal?.id ? `Edit ${animal.name}` : "Add a pet"}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Name + Species */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Pet name *">
            <input className="d-input" style={{ width: "100%" }} placeholder="e.g. Buddy"
              value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Species *">
            <select className="d-input" style={{ width: "100%" }} value={species} onChange={(e) => setSpecies(e.target.value)}>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Bird">Bird</option>
              <option value="Rabbit">Rabbit</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>

        {/* Breed + Sex */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Breed">
            <input className="d-input" style={{ width: "100%" }} placeholder="e.g. Labrador"
              value={breed} onChange={(e) => setBreed(e.target.value)} />
          </Field>
          <Field label="Sex">
            <select className="d-input" style={{ width: "100%" }} value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Weight (lbs)">
            <input className="d-input" style={{ width: "100%" }} type="number" min={0} step="0.1" placeholder="e.g. 45"
              value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Vaccinated">
            <select className="d-input" style={{ width: "100%" }} value={vaccinated} onChange={(e) => setVaccinated(e.target.value)}>
              <option value="unknown">Unknown</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        </div>

        {/* Preferred cadence */}
        <Field label="Grooming cadence (days)">
          <input className="d-input" style={{ width: "100%" }} type="number" min={1} max={365} placeholder="e.g. 42"
            value={cadence} onChange={(e) => setCadence(e.target.value)} />
        </Field>

        {/* Allergies */}
        <Field label="Allergies">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: allergies.length > 0 ? 8 : 0 }}>
            {allergies.map((a) => (
              <span key={a} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 999,
                background: "#ffedd5", color: "var(--acc)",
                fontSize: 12, fontWeight: 600,
                border: "1px solid oklch(from var(--acc) l c h / 0.25)",
              }}>
                {a}
                <button type="button" onClick={() => removeTag(allergies, setAllergies, a)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", lineHeight: 1, fontSize: 14 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="d-input" style={{ flex: 1 }} placeholder="Type and press Enter"
              value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(allergies, setAllergies, allergyInput, setAllergyInput); } }} />
            <button type="button" className="d-btn"
              onClick={() => addTag(allergies, setAllergies, allergyInput, setAllergyInput)}
              style={{ fontSize: 12, padding: "0 12px" }}>Add</button>
          </div>
        </Field>

        {/* Behavior flags */}
        <Field label="Behavior notes">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: flags.length > 0 ? 8 : 0 }}>
            {flags.map((f) => (
              <span key={f} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 999,
                background: "#fef3c7", color: "#92400e",
                fontSize: 12, fontWeight: 600, border: "1px solid #fde68a",
              }}>
                {f}
                <button type="button" onClick={() => removeTag(flags, setFlags, f)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", lineHeight: 1, fontSize: 14 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="d-input" style={{ flex: 1 }} placeholder="e.g. Gentle giant, anxious"
              value={flagInput} onChange={(e) => setFlagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(flags, setFlags, flagInput, setFlagInput); } }} />
            <button type="button" className="d-btn"
              onClick={() => addTag(flags, setFlags, flagInput, setFlagInput)}
              style={{ fontSize: 12, padding: "0 12px" }}>Add</button>
          </div>
        </Field>

        {/* Care summary */}
        <Field label="Care summary">
          <textarea className="d-input" style={{ width: "100%", minHeight: 72, resize: "vertical" }}
            placeholder="Key grooming notes shown at a glance…"
            value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff1ee", borderRadius: 8, color: "var(--acc)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button className="d-btn" onClick={onClose} disabled={isPending}>Cancel</button>
        <button className="d-btn d-btn-primary" onClick={handleSubmit} disabled={isPending || !name.trim()}>
          {isPending ? "Saving…" : animal?.id ? "Save changes" : "Add pet"}
        </button>
      </div>
    </Overlay>
  );
}
