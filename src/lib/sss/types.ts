/** Student Special Services — separate from School Office and Rewards. */

export type SssContact = {
  label?: string | null;
  phone?: string | null;
};

export type SssProvider = {
  name: string;
  hours?: number | null;
};

export type SssStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  sourceSchool?: string | null;
  dateOfBirth?: string | null;
  homeAddress?: string | null;
  parent1Name?: string | null;
  parent2Name?: string | null;
  email1?: string | null;
  email2?: string | null;
  contacts?: SssContact[] | null;
  providers?: SssProvider[] | null;
  notes?: string | null;
  updatedAt: number;
};
