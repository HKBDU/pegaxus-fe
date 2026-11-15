import { describe, expect, it } from "vitest"
import {
  fancyText,
  formatPageTitle,
  truncateByCodePoints,
  FANCY_TITLE_ENABLED,
} from "@/lib/fancy-text"

describe("fancyText utility", () => {
  it("converts uppercase ASCII A-Z to Mathematical Sans-Serif Bold", () => {
    expect(fancyText("PEGAXUS")).toBe("𝗣𝗘𝗚𝗔𝗫𝗨𝗦")
    expect(fancyText("AZ")).toBe("𝗔𝗭")
  })

  it("converts lowercase ASCII a-z to Mathematical Sans-Serif Bold", () => {
    expect(fancyText("Create Booking")).toBe("𝗖𝗿𝗲𝗮𝘁𝗲 𝗕𝗼𝗼𝗸𝗶𝗻𝗴")
    expect(fancyText("az")).toBe("𝗮𝘇")
  })

  it("converts ASCII digits 0-9 to Mathematical Sans-Serif Bold", () => {
    expect(fancyText("2026")).toBe("𝟮𝟬𝟮𝟲")
    expect(fancyText("0123456789")).toBe("𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵")
  })

  it("preserves punctuation, symbols, and spaces unchanged", () => {
    expect(fancyText("Hello, World! (123) · - _")).toBe("𝗛𝗲𝗹𝗹𝗼, 𝗪𝗼𝗿𝗹𝗱! (𝟭𝟮𝟯) · - _")
  })

  it("preserves accented characters unchanged", () => {
    expect(fancyText("Hôtel naïve résumé")).toBe("𝗛ô𝘁𝗲𝗹 𝗻𝗮ï𝘃𝗲 𝗿é𝘀𝘂𝗺é")
    expect(fancyText("São Paulo & München")).toBe("𝗦ã𝗼 𝗣𝗮𝘂𝗹𝗼 & 𝗠ü𝗻𝗰𝗵𝗲𝗻")
  })

  it("safely handles already-converted input without corruption", () => {
    const styled = fancyText("PEGAXUS")
    expect(fancyText(styled)).toBe(styled)
    expect(fancyText("𝗣𝗘𝗚𝗔𝗫𝗨𝗦")).toBe("𝗣𝗘𝗚𝗔𝗫𝗨𝗦")
  })

  it("handles empty or nullish strings safely", () => {
    expect(fancyText("")).toBe("")
  })

  it("respects FANCY_TITLE_ENABLED flag", () => {
    expect(typeof FANCY_TITLE_ENABLED).toBe("boolean")
  })
})

describe("truncateByCodePoints", () => {
  it("does not split surrogate pairs when truncating", () => {
    const fancyWord = "𝗣𝗘𝗚𝗔𝗫𝗨𝗦" // 7 code points, each 2 UTF-16 code units (surrogate pair)
    expect(fancyWord.length).toBe(14)
    expect(Array.from(fancyWord).length).toBe(7)

    const truncated = truncateByCodePoints(fancyWord, 4)
    expect(Array.from(truncated).length).toBe(4) // 3 code points + ellipsis
    expect(truncated).toBe("𝗣𝗘𝗚…")
  })

  it("returns original text if shorter than or equal to maxLength", () => {
    expect(truncateByCodePoints("Test", 10)).toBe("Test")
  })
})

describe("formatPageTitle", () => {
  it("formats brand only when page name is omitted or empty", () => {
    expect(formatPageTitle()).toBe("𝗣𝗘𝗚𝗔𝗫𝗨𝗦")
    expect(formatPageTitle("")).toBe("𝗣𝗘𝗚𝗔𝗫𝗨𝗦")
    expect(formatPageTitle("   ")).toBe("𝗣𝗘𝗚𝗔𝗫𝗨𝗦")
  })

  it("formats brand with page name using middle dot separator", () => {
    expect(formatPageTitle("Create Booking")).toBe("𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗖𝗿𝗲𝗮𝘁𝗲 𝗕𝗼𝗼𝗸𝗶𝗻𝗴")
    expect(formatPageTitle("Home")).toBe("𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗛𝗼𝗺𝗲")
  })

  it("prefixes attention count in plain text when count > 0", () => {
    expect(formatPageTitle("Revision requested", 2)).toBe("(2) 𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗥𝗲𝘃𝗶𝘀𝗶𝗼𝗻 𝗿𝗲𝗾𝘂𝗲𝘀𝘁𝗲𝗱")
    expect(formatPageTitle("Notifications", 5)).toBe("(5) 𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗡𝗼𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀")
  })

  it("caps attention count at 9+", () => {
    expect(formatPageTitle("Notifications", 10)).toBe("(9+) 𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗡𝗼𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀")
    expect(formatPageTitle("Notifications", 99)).toBe("(9+) 𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗡𝗼𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻𝘀")
  })

  it("keeps visible title under ~40 code points with an ellipsis", () => {
    const longTitle = formatPageTitle("Very Long Dynamic Transport Name That Exceeds Normal Length")
    expect(Array.from(longTitle).length).toBeLessThanOrEqual(40)
    expect(longTitle.endsWith("…")).toBe(true)
  })
})

