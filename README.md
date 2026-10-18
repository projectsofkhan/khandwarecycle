# Khandwa Recycles

An independent, citizen-led project mapping how much waste each area of Khandwa generates, and how much of it is recovered.

**Live site:** [khandwa-recycles.vercel.app](https://khandwa-recycles.vercel.app)

---

## What this is

A single-page map dashboard showing eight super-zones of Khandwa, each with an illustrative recycling-access score, waste-generation estimate, plastic share, greenery coverage, and cleanliness score.

The project exists to make one invisible civic fact visible: what happens to the waste your area produces, and how much of it is actually recovered rather than dumped, burned, or buried.

## What this is not

- **Not an official website** of the Khandwa Municipal Corporation, the Government of Madhya Pradesh, or any government body.
- **Not affiliated with or endorsed by** any of the above.
- **Not a basis** for legal, financial, commercial, or policy decisions.
- **Not a grievance or reporting platform.** It is for information and awareness only.

If you arrived here expecting to file a complaint, please contact the Khandwa Municipal Corporation directly.

---

## Data honesty

Every number on the site carries one of two badges:

**Official** — drawn from a public government or CPCB source.

**Estimate** — locally modelled and clearly labelled. Based on observed service patterns and local field notes, not on ward-level statistics, which do not publicly exist for Khandwa.

The map itself is entirely estimates. The city-level figures at the top of the page are entirely official. Do not mix the two.

### Official sources used

- **Swachh Survekshan 2024–25** — national rank (55), source segregation rate (45%), overall city score (~45%).
- **CPCB (Central Pollution Control Board)** — national per-capita waste generation benchmark (~0.34 kg/person/day).
- **Khandwa Municipal Corporation** — administrative wards (50), population (~2 lakh, 2011 census), plastic waste generation (~5.16 T/day).
- **Khandwa NIC district portal** — administrative and geographic context ([khandwa.nic.in](https://khandwa.nic.in/en/)).

### What does not exist publicly

- Ward-level waste generation data for Khandwa.
- Ward-level recycling or segregation rates.
- Machine-readable ward-boundary GeoJSON.
- A public waste-related API for any Indian municipality at ward level.

Anyone claiming to have these numbers at Khandwa ward level is either extrapolating from city totals or working from internal municipal records not available to the public.

---

## Super-zones

The project covers eight areas of Khandwa that locals recognise by name. Each super-zone covers roughly three to eight administrative wards, rolled up into one aggregate.

1. **Khanshahwali** — central market cluster, highest commercial waste density.
2. **Anand Nagar** — mixed residential, moderate segregation uptake.
3. **Bengali Colony** — older residential lanes, frequent collection, no recovery infrastructure.
4. **Padam Nagar** — residential with newer housing stock, higher awareness.
5. **Civil Lines** — administrative and low-density, best servicing in the city.
6. **Ghaspura** — dense older core, narrow lanes limit collection vehicles.
7. **Imlipura** — mixed residential and small trade, informal scrap recovery.
8. **Ganesh Talai** — older neighbourhood, waterfront waste handling is the weak point.

All eight are illustrative estimates. Please correct them if you have better local data.

---

## How to run locally

No build step. No npm. No framework.

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/khandwa-recycles.git
cd khandwa-recycles

# Serve locally (any static server works)
python3 -m http.server 8000
# or
npx serve .