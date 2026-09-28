// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The bundled medication catalog for a phone set to the United States: common
// generic names as a US pharmacy label prints them, each with the strengths it
// is commonly dispensed in. The Add form's autocomplete and dose chips read
// this instead of the Swedish catalog (`medications.ts`) when the device's
// locale is American — see `catalogRegion` in `../catalog.ts`.
//
// **This file is data, and it never leaves the device** — the same rule, and
// the same shape, as the Swedish catalog: a bundled chunk behind `import()`,
// searched locally, never a lookup service. The names and strengths are
// RxNorm's normalized clinical drugs [ref:nlm-2025-rxnorm], restated in the
// way a label writes them ("50 mcg", not RxNorm's "0.05 MG"); each strength
// here was checked against an RxNorm clinical drug for the same ingredient.
//
// Curation rule: common, currently dispensed medications, by generic name
// only — no brand names — and nothing on the DEA's controlled-substance
// schedules. That last one is this app's choice rather than the source's: an
// aid to typing has no reason to be the place an opioid or a sleeping pill is
// suggested. A salt the label names is kept where it tells two products apart
// (metoprolol succinate and tartrate); otherwise the plain name is used.
// Strengths are the usual per-dose ones, lowest first. An unlisted medication
// is typed by hand and works exactly the same.

import type { CatalogEntry } from "./medications.ts";

function m(name: string, ...strengths: string[]): CatalogEntry {
  return { name, strengths };
}

export const MEDICATIONS: CatalogEntry[] = [
  // Pain, fever and inflammation
  m("Acetaminophen", "325 mg", "500 mg"),
  m("Ibuprofen", "200 mg", "400 mg", "600 mg", "800 mg"),
  m("Naproxen", "250 mg", "375 mg", "500 mg"),
  m("Naproxen sodium", "220 mg", "275 mg", "550 mg"),
  m("Aspirin", "81 mg", "325 mg"),
  m("Meloxicam", "7.5 mg", "15 mg"),
  m("Diclofenac", "50 mg", "75 mg"),
  m("Celecoxib", "100 mg", "200 mg"),
  m("Cyclobenzaprine", "5 mg", "10 mg"),
  m("Methocarbamol", "500 mg", "750 mg"),
  m("Tizanidine", "2 mg", "4 mg"),
  m("Baclofen", "5 mg", "10 mg", "20 mg"),

  // Heart and blood pressure
  m("Lisinopril", "2.5 mg", "5 mg", "10 mg", "20 mg", "40 mg"),
  m("Enalapril", "2.5 mg", "5 mg", "10 mg", "20 mg"),
  m("Benazepril", "10 mg", "20 mg", "40 mg"),
  m("Ramipril", "1.25 mg", "2.5 mg", "5 mg", "10 mg"),
  m("Losartan", "25 mg", "50 mg", "100 mg"),
  m("Valsartan", "40 mg", "80 mg", "160 mg", "320 mg"),
  m("Olmesartan", "20 mg", "40 mg"),
  m("Irbesartan", "75 mg", "150 mg", "300 mg"),
  m("Amlodipine", "2.5 mg", "5 mg", "10 mg"),
  m("Diltiazem", "120 mg", "180 mg", "240 mg"),
  m("Verapamil", "120 mg", "180 mg", "240 mg"),
  m("Metoprolol succinate", "25 mg", "50 mg", "100 mg", "200 mg"),
  m("Metoprolol tartrate", "25 mg", "50 mg", "100 mg"),
  m("Carvedilol", "3.125 mg", "6.25 mg", "12.5 mg", "25 mg"),
  m("Atenolol", "25 mg", "50 mg", "100 mg"),
  m("Propranolol", "10 mg", "20 mg", "40 mg", "80 mg"),
  m("Bisoprolol", "5 mg", "10 mg"),
  m("Hydrochlorothiazide", "12.5 mg", "25 mg"),
  m("Chlorthalidone", "25 mg", "50 mg"),
  m("Furosemide", "20 mg", "40 mg", "80 mg"),
  m("Spironolactone", "25 mg", "50 mg", "100 mg"),
  m("Hydralazine", "10 mg", "25 mg", "50 mg"),
  m("Clonidine", "0.1 mg", "0.2 mg"),
  m("Isosorbide mononitrate", "30 mg", "60 mg"),
  m("Nitroglycerin", "0.4 mg"),
  m("Atorvastatin", "10 mg", "20 mg", "40 mg", "80 mg"),
  m("Simvastatin", "10 mg", "20 mg", "40 mg"),
  m("Rosuvastatin", "5 mg", "10 mg", "20 mg", "40 mg"),
  m("Pravastatin", "10 mg", "20 mg", "40 mg", "80 mg"),
  m("Lovastatin", "20 mg", "40 mg"),
  m("Ezetimibe", "10 mg"),
  m("Fenofibrate", "48 mg", "145 mg"),
  m("Clopidogrel", "75 mg"),
  m("Apixaban", "2.5 mg", "5 mg"),
  m("Rivaroxaban", "10 mg", "15 mg", "20 mg"),
  m("Warfarin", "1 mg", "2 mg", "2.5 mg", "5 mg"),
  m("Digoxin", "125 mcg", "250 mcg"),
  m("Amiodarone", "200 mg"),
  m("Potassium chloride", "10 mEq", "20 mEq"),

  // Diabetes
  m("Metformin", "500 mg", "850 mg", "1000 mg"),
  m("Metformin ER", "500 mg", "750 mg"),
  m("Glipizide", "5 mg", "10 mg"),
  m("Glimepiride", "1 mg", "2 mg", "4 mg"),
  m("Pioglitazone", "15 mg", "30 mg", "45 mg"),
  m("Sitagliptin", "25 mg", "50 mg", "100 mg"),
  m("Empagliflozin", "10 mg", "25 mg"),
  m("Dapagliflozin", "5 mg", "10 mg"),
  m("Insulin glargine", "100 units/mL"),
  m("Insulin lispro", "100 units/mL"),

  // Thyroid
  m(
    "Levothyroxine",
    "25 mcg",
    "50 mcg",
    "75 mcg",
    "88 mcg",
    "100 mcg",
    "112 mcg",
    "125 mcg",
    "150 mcg",
  ),
  m("Liothyronine", "5 mcg", "25 mcg"),
  m("Methimazole", "5 mg", "10 mg"),

  // Stomach and bowel
  m("Omeprazole", "20 mg", "40 mg"),
  m("Esomeprazole", "20 mg", "40 mg"),
  m("Pantoprazole", "20 mg", "40 mg"),
  m("Lansoprazole", "15 mg", "30 mg"),
  m("Famotidine", "10 mg", "20 mg", "40 mg"),
  m("Ondansetron", "4 mg", "8 mg"),
  m("Metoclopramide", "5 mg", "10 mg"),
  m("Dicyclomine", "10 mg", "20 mg"),
  m("Sucralfate", "1 g"),
  m("Loperamide", "2 mg"),
  m("Docusate", "100 mg"),
  m("Sennosides", "8.6 mg"),
  m("Bisacodyl", "5 mg"),
  m("Polyethylene glycol 3350", "17 g"),
  m("Simethicone", "80 mg", "125 mg"),

  // Infections
  m("Amoxicillin", "250 mg", "500 mg", "875 mg"),
  m("Amoxicillin-clavulanate", "500 mg/125 mg", "875 mg/125 mg"),
  m("Penicillin V potassium", "250 mg", "500 mg"),
  m("Cephalexin", "250 mg", "500 mg"),
  m("Azithromycin", "250 mg", "500 mg"),
  m("Doxycycline", "50 mg", "100 mg"),
  m("Ciprofloxacin", "250 mg", "500 mg"),
  m("Levofloxacin", "250 mg", "500 mg", "750 mg"),
  m("Sulfamethoxazole-trimethoprim", "400 mg/80 mg", "800 mg/160 mg"),
  m("Nitrofurantoin", "50 mg", "100 mg"),
  m("Metronidazole", "250 mg", "500 mg"),
  m("Clindamycin", "150 mg", "300 mg"),
  m("Fluconazole", "150 mg"),
  m("Valacyclovir", "500 mg", "1 g"),
  m("Acyclovir", "400 mg", "800 mg"),
  m("Oseltamivir", "30 mg", "45 mg", "75 mg"),

  // Mood, sleep and the nervous system
  m("Sertraline", "25 mg", "50 mg", "100 mg"),
  m("Escitalopram", "5 mg", "10 mg", "20 mg"),
  m("Citalopram", "10 mg", "20 mg", "40 mg"),
  m("Fluoxetine", "10 mg", "20 mg", "40 mg"),
  m("Paroxetine", "10 mg", "20 mg", "30 mg", "40 mg"),
  m("Venlafaxine", "37.5 mg", "75 mg", "150 mg"),
  m("Duloxetine", "20 mg", "30 mg", "60 mg"),
  m("Bupropion", "150 mg", "300 mg"),
  m("Mirtazapine", "7.5 mg", "15 mg", "30 mg", "45 mg"),
  m("Trazodone", "50 mg", "100 mg", "150 mg"),
  m("Amitriptyline", "10 mg", "25 mg", "50 mg"),
  m("Nortriptyline", "10 mg", "25 mg", "50 mg"),
  m("Buspirone", "5 mg", "10 mg", "15 mg", "30 mg"),
  m("Hydroxyzine", "10 mg", "25 mg", "50 mg"),
  m("Quetiapine", "25 mg", "50 mg", "100 mg", "200 mg", "300 mg"),
  m("Aripiprazole", "2 mg", "5 mg", "10 mg", "15 mg"),
  m("Risperidone", "0.5 mg", "1 mg", "2 mg"),
  m("Olanzapine", "5 mg", "10 mg"),
  m("Lithium carbonate", "150 mg", "300 mg", "600 mg"),
  m("Lamotrigine", "25 mg", "100 mg", "150 mg", "200 mg"),
  m("Levetiracetam", "250 mg", "500 mg", "750 mg", "1000 mg"),
  m("Topiramate", "25 mg", "50 mg", "100 mg"),
  m("Divalproex", "250 mg", "500 mg"),
  m("Carbamazepine", "200 mg"),
  m("Atomoxetine", "10 mg", "18 mg", "25 mg", "40 mg", "60 mg"),
  m("Guanfacine", "1 mg", "2 mg"),
  m("Prazosin", "1 mg", "2 mg", "5 mg"),
  m("Donepezil", "5 mg", "10 mg"),
  m("Memantine", "5 mg", "10 mg"),
  m("Ropinirole", "0.25 mg", "0.5 mg", "1 mg", "2 mg"),
  m("Pramipexole", "0.125 mg", "0.25 mg", "0.5 mg", "1 mg"),
  m("Carbidopa-levodopa", "25 mg/100 mg"),
  m("Varenicline", "0.5 mg", "1 mg"),
  m("Naltrexone", "50 mg"),

  // Migraine
  m("Sumatriptan", "25 mg", "50 mg", "100 mg"),
  m("Rizatriptan", "5 mg", "10 mg"),

  // Allergy, asthma and airways
  m("Cetirizine", "5 mg", "10 mg"),
  m("Loratadine", "10 mg"),
  m("Fexofenadine", "60 mg", "180 mg"),
  m("Diphenhydramine", "25 mg", "50 mg"),
  m("Montelukast", "4 mg", "5 mg", "10 mg"),
  m("Fluticasone nasal spray", "50 mcg/spray"),
  m("Albuterol inhaler", "90 mcg/puff"),
  m("Budesonide-formoterol", "80 mcg/4.5 mcg", "160 mcg/4.5 mcg"),
  m(
    "Fluticasone-salmeterol",
    "100 mcg/50 mcg",
    "250 mcg/50 mcg",
    "500 mcg/50 mcg",
  ),
  m("Tiotropium", "18 mcg"),
  m("Benzonatate", "100 mg", "200 mg"),
  m("Guaifenesin", "400 mg", "600 mg"),
  m("Prednisone", "5 mg", "10 mg", "20 mg"),
  m("Methylprednisolone", "4 mg"),
  m("Dexamethasone", "0.5 mg", "1 mg", "4 mg", "6 mg"),

  // Hormones, bone, and women's and men's health
  m("Estradiol", "0.5 mg", "1 mg", "2 mg"),
  m("Medroxyprogesterone", "2.5 mg", "5 mg", "10 mg"),
  m("Progesterone", "100 mg", "200 mg"),
  m("Norethindrone", "0.35 mg"),
  m("Alendronate", "35 mg", "70 mg"),
  m("Raloxifene", "60 mg"),
  m("Anastrozole", "1 mg"),
  m("Letrozole", "2.5 mg"),
  m("Tamoxifen", "10 mg", "20 mg"),
  m("Tamsulosin", "0.4 mg"),
  m("Finasteride", "1 mg", "5 mg"),
  m("Sildenafil", "20 mg", "25 mg", "50 mg", "100 mg"),
  m("Tadalafil", "2.5 mg", "5 mg", "10 mg", "20 mg"),
  m("Oxybutynin", "5 mg", "10 mg"),
  m("Mirabegron", "25 mg", "50 mg"),
  m("Ferrous sulfate", "325 mg"),
  m("Folic acid", "1 mg"),
  m("Vitamin B12", "1000 mcg"),

  // Joints, gout and the immune system
  m("Allopurinol", "100 mg", "300 mg"),
  m("Colchicine", "0.6 mg"),
  m("Febuxostat", "40 mg", "80 mg"),
  m("Methotrexate", "2.5 mg"),
  m("Hydroxychloroquine", "200 mg"),
  m("Sulfasalazine", "500 mg"),

  // Eyes and skin
  m("Latanoprost eye drops", "0.005%"),
  m("Timolol eye drops", "0.25%", "0.5%"),
  m("Hydrocortisone cream", "1%", "2.5%"),
  m("Triamcinolone cream", "0.1%"),
  m("Mupirocin ointment", "2%"),
];
