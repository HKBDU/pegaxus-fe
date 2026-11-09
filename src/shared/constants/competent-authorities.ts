/**
 * Competent authorities a compliance dossier can be submitted to, one or more for every country with locations in the system.
 * The BE accepts only these names, and only for a country on the dossier's route
 * (Pegaxus.Service/Common/CompetentAuthorities.cs). Keep both lists identical.
 */
export const COMPETENT_AUTHORITIES = [
  { name: "DEFRA - Department for Environment, Food & Rural Affairs (UK)", countryCode: "GB" },
  { name: "APHA - Animal and Plant Health Agency (UK)", countryCode: "GB" },
  { name: "HMRC - HM Revenue & Customs (UK)", countryCode: "GB" },
  { name: "DAERA - Department of Agriculture, Environment and Rural Affairs (Northern Ireland)", countryCode: "GB" },
  { name: "DAFM - Department of Agriculture, Food and the Marine (Ireland)", countryCode: "IE" },
  { name: "DGAL - Direction générale de l'alimentation (France)", countryCode: "FR" },
  { name: "DGDDI - Direction générale des douanes et droits indirects (France)", countryCode: "FR" },
  { name: "BMEL - Federal Ministry of Food and Agriculture (Germany)", countryCode: "DE" },
  { name: "NVWA - Netherlands Food and Consumer Product Safety Authority (Netherlands)", countryCode: "NL" },
  { name: "FASFC - Federal Agency for the Safety of the Food Chain (Belgium)", countryCode: "BE" },
  { name: "Ministero della Salute - Ministry of Health (Italy)", countryCode: "IT" },
  { name: "MAPA - Ministry of Agriculture, Fisheries and Food (Spain)", countryCode: "ES" },
  { name: "BMSGPK - Federal Ministry of Social Affairs, Health, Care and Consumer Protection (Austria)", countryCode: "AT" },
  { name: "GIW - General Veterinary Inspectorate (Poland)", countryCode: "PL" },
  { name: "Jordbruksverket - Swedish Board of Agriculture (Sweden)", countryCode: "SE" },
  { name: "DVFA - Danish Veterinary and Food Administration (Denmark)", countryCode: "DK" },
  { name: "SVS - State Veterinary Administration (Czech Republic)", countryCode: "CZ" },
  { name: "DGAV - Direção-Geral de Alimentação e Veterinária (Portugal)", countryCode: "PT" },
] as const;

export type CompetentAuthority = { name: string; countryCode: string };
