export interface ICreateBranches {
  name: string;
  address: string;
  vehicles?: string[];
  tours?: string[];
  users?: string[];
}

export interface ICreateCarousel {
  vehicleId: string;
  description?: string;
  descriptionEn?: string;
  colors: string[];
}