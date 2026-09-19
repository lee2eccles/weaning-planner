import { describe, it, expect } from "vitest";
import { findLegumes, isLegumeFree } from "@/lib/data/legumes";

describe("legume detection", () => {
  it("catches the obvious pulses", () => {
    for (const t of ["red lentils", "tinned chickpeas", "black beans", "cannellini beans"]) {
      expect(findLegumes(t).length).toBeGreaterThan(0);
    }
  });

  it("catches fresh pods, which are the easy ones to miss", () => {
    for (const t of ["60g frozen peas", "green beans, cut short", "cooked edamame", "mangetout", "sugar snap peas"]) {
      expect(findLegumes(t).length).toBeGreaterThan(0);
    }
  });

  it("catches peanut and soya, which people forget are legumes", () => {
    for (const t of ["peanut butter", "60g firm tofu", "a splash of soy sauce", "miso paste", "groundnut oil"]) {
      expect(findLegumes(t).length).toBeGreaterThan(0);
    }
  });

  it("does not fire on words that merely contain a legume substring", () => {
    for (const t of ["1 ripe pear", "a peach", "pearl barley", "vanilla bean paste", "coffee beans", "bean sprouts"]) {
      expect(isLegumeFree(t)).toBe(true);
    }
  });

  it("is case and punctuation insensitive", () => {
    expect(findLegumes("Chickpeas, rinsed and drained.").length).toBeGreaterThan(0);
    expect(findLegumes("TOFU").length).toBeGreaterThan(0);
  });
});
