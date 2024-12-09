export interface ICompanyCreate {
  name: string;
  users: string[];
}

export interface IAddBranchesToCompany {
  companyId: string;
  branches: string[];
}
