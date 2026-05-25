"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createSetupIntent, saveCard, deleteCard, setDefaultCard } from "@/server/actions/cards";

// Stripe.js is loaded lazily — null if publishable key isn't set
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export type SavedCardRow = {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export function CardOnFileSection({
  clientId,
  cards,
}: {
  clientId: string;
  cards: SavedCardRow[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAddCard() {
    if (!stripePromise) {
      setAddError("Stripe is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
      return;
    }
    setAddError(null);
    startTransition(async () => {
      try {
        const result = await createSetupIntent(clientId);
        setClientSecret(result.clientSecret);
        setShowModal(true);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to start card setup");
      }
    });
  }

  function handleCardSaved() {
    setShowModal(false);
    setClientSecret(null);
    router.refresh();
  }

  function handleDelete(cardId: string) {
    if (!confirm("Remove this card from file?")) return;
    startTransition(async () => {
      try {
        await deleteCard(cardId);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to remove card");
      }
    });
  }

  function handleSetDefault(cardId: string) {
    startTransition(async () => {
      await setDefaultCard(cardId);
      router.refresh();
    });
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid var(--d-line-2)",
        padding: "22px 24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
          Cards on file
        </div>
        <button
          className="d-btn d-btn-primary"
          style={{ fontSize: 13, padding: "6px 14px" }}
          onClick={handleAddCard}
          disabled={isPending}
        >
          {isPending ? "…" : "+ Add card"}
        </button>
      </div>

      {addError && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            background: "oklch(from var(--oxblood) l c h / 0.08)",
            borderRadius: 8,
            color: "var(--oxblood)",
            fontSize: 13,
          }}
        >
          {addError}
        </div>
      )}

      {/* Card list */}
      {cards.length === 0 ? (
        <div
          style={{
            color: "var(--d-ink-4)",
            fontSize: 13,
            padding: "20px 0",
            textAlign: "center",
          }}
        >
          No cards on file. Add one to enable fast checkout and no-show protection.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              isPending={isPending}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Add card modal */}
      {showModal && clientSecret && stripePromise && (
        <Elements stripe={stripePromise}>
          <AddCardModal
            clientId={clientId}
            clientSecret={clientSecret}
            onSuccess={handleCardSaved}
            onClose={() => {
              setShowModal(false);
              setClientSecret(null);
            }}
          />
        </Elements>
      )}
    </div>
  );
}

// ─── Card row ─────────────────────────────────────────────────────────────────

function CardRow({
  card,
  isPending,
  onDelete,
  onSetDefault,
}: {
  card: SavedCardRow;
  isPending: boolean;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: card.isDefault
          ? "oklch(from var(--oxblood) l c h / 0.04)"
          : "#fafafa",
        borderRadius: 12,
        border: card.isDefault
          ? "1.5px solid oklch(from var(--oxblood) l c h / 0.2)"
          : "1px solid var(--d-line-2)",
      }}
    >
      <div style={{ fontSize: 22, flexShrink: 0 }}>💳</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--d-ink)" }}>
          {capitalize(card.brand)} •••• {card.last4}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--d-ink-3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>
            Expires {card.expMonth.toString().padStart(2, "0")}/
            {card.expYear.toString().slice(-2)}
          </span>
          {card.isDefault && (
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                background: "oklch(from var(--oxblood) l c h / 0.1)",
                color: "var(--oxblood)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Default
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {!card.isDefault && (
          <button
            className="d-btn"
            style={{ fontSize: 11, padding: "4px 10px" }}
            disabled={isPending}
            onClick={() => onSetDefault(card.id)}
          >
            Set default
          </button>
        )}
        <button
          className="d-btn"
          style={{ fontSize: 11, padding: "4px 10px", color: "#b91c1c" }}
          disabled={isPending}
          onClick={() => onDelete(card.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Add card modal ───────────────────────────────────────────────────────────

function AddCardModal({
  clientId,
  clientSecret,
  onSuccess,
  onClose,
}: {
  clientId: string;
  clientSecret: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setLoading(true);
    setError(null);

    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card setup failed");
      setLoading(false);
      return;
    }

    if (!setupIntent?.payment_method) {
      setError("Setup incomplete — no payment method returned");
      setLoading(false);
      return;
    }

    const pmId =
      typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;

    try {
      await saveCard({ clientId, paymentMethodId: pmId });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save card");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15, 15, 20, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "28px 32px",
          borderRadius: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: "var(--dash-serif)", fontSize: 20 }}>
            Add card on file
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--d-line)",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--d-ink-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            &times;
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--d-ink-3)", lineHeight: 1.55, marginBottom: 18 }}>
          Card details are collected securely by Stripe and never touch our servers. A $0.50
          hold is placed and immediately released to verify the card is valid.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Stripe CardElement */}
          <div
            style={{
              padding: "13px 16px",
              border: "1.5px solid var(--d-line)",
              borderRadius: 10,
              background: "#fff",
              marginBottom: 14,
            }}
          >
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "15px",
                    color: "#1a1a2e",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    "::placeholder": { color: "#9ca3af" },
                  },
                  invalid: { color: "#b91c1c" },
                },
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "oklch(from var(--oxblood) l c h / 0.08)",
                borderRadius: 8,
                color: "var(--oxblood)",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="d-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="d-btn d-btn-primary"
              disabled={loading || !stripe}
            >
              {loading ? "Saving card…" : "Save card"}
            </button>
          </div>
        </form>

        <p style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "var(--d-ink-4)" }}>
          🔒 Secured by Stripe. Card data never stored on our servers.
        </p>
      </div>
    </div>
  );
}

// ─── utils ────────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
