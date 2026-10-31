// Auto-generated from the 15 uploaded BTEB department JSON files in /public/assets/aistudio/
export interface UploadedDepartmentSubject {
  code: string;
  name: string;
  credit: number;
  theory_per_week: number;
  practical_per_week: number;
  marks?: number;
}

export interface UploadedDepartmentSemester {
  semester: string;
  total_subjects?: number;
  periods_per_week?: number;
  total_credits?: number;
  total_marks?: number;
  subjects: UploadedDepartmentSubject[];
}

export interface UploadedDepartmentDataset {
  source_file: string;
  syntaxWarning: string | null;
  department_name: string;
  department_code: string;
  regulation: string;
  semesters: UploadedDepartmentSemester[];
}

export const UPLOADED_DEPARTMENT_DATASETS: UploadedDepartmentDataset[] = [
  {
    "source_file": "Architecture_technology_518a1b7b",
    "syntaxWarning": null,
    "department_name": "Architecture Technology",
    "department_code": "61",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26111",
            "name": "Creativity and Concept Development",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26121",
            "name": "Architectural Design-I",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "26411",
            "name": "Civil Engineering Materials",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26131",
            "name": "Architectural Design-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26132",
            "name": "Architectural Graphics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26133",
            "name": "Working Drawing-I",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "26134",
            "name": "Climatology",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26135",
            "name": "Computer Aided Drawing -I",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26141",
            "name": "Architectural Design-III",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "26142",
            "name": "History of Architecture-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26143",
            "name": "Working Drawing -II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26144",
            "name": "Computer Aided Drawing -II",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26434",
            "name": "Basic Construction Process",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26447",
            "name": "Basic Estimating & Costing",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 19,
        "total_marks": 950,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26151",
            "name": "Architectural Design-IV",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "26152",
            "name": "History of Architecture-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26153",
            "name": "Model Making",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26154",
            "name": "Presentation and Visual Technique",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26431",
            "name": "Structural Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26457",
            "name": "Water Supply and Sanitary Engineering",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 19,
        "total_marks": 950,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26161",
            "name": "Architectural Design-V",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26162",
            "name": "Computer Rendering and Animation-I",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26163",
            "name": "Landscape Design",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "26164",
            "name": "Modern Architecture",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26165",
            "name": "Interior Design -I",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "26464",
            "name": "Design of Structure-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26171",
            "name": "Architectural Project",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26172",
            "name": "Computer Rendering and Animation-II",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26173",
            "name": "Urban Planning",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26174",
            "name": "Professional Practice",
            "credit": 3,
            "theory_per_week": 3,
            "practical_per_week": 0,
            "marks": 150
          },
          {
            "code": "26175",
            "name": "Interior Design -II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27821",
            "name": "Basic Surveying",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26181",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26181",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Automobile_technology_9ce72436",
    "syntaxWarning": "Automobile_technology_9ce72436: Expected ',' or '}' after property value in JSON at position 100 (line 5 column 3) (missing comma after \"regulation\": \"2022\" on line 4)",
    "department_name": "Automobile Technology",
    "department_code": "62",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26211",
            "name": "Automobile Fundamentals",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26221",
            "name": "Automotive Engine System-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 19,
        "total_marks": 950,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26231",
            "name": "Automotive Engine System-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27012",
            "name": "Machine Shop Practice-I",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27031",
            "name": "Mechanical Engineering Materials",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26241",
            "name": "Automotive Body Building",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27041",
            "name": "Engineering Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27043",
            "name": "Metallurgy",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27131",
            "name": "Engineering Thermodynamics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27142",
            "name": "Fuels & Lubricants",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26251",
            "name": "Automobile Air- Conditioning",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26252",
            "name": "Advance Automotive Mechanisms",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27051",
            "name": "Fluid Mechanics & Machineries",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27052",
            "name": "Mechanical Estimating & Costing",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27053",
            "name": "Advanced Welding-I",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "27055",
            "name": "Manufacturing Process",
            "credit": 3,
            "theory_per_week": 3,
            "practical_per_week": 0,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26261",
            "name": "Engine Overhauling & Inspection",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26262",
            "name": "Suspension, Brake, Steering & Transmission System of Vehicle",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26263",
            "name": "Specialized Vehicles, Two & Three Wheelers",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27054",
            "name": "Foundry & Pattern Making",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27061",
            "name": "Strength of Materials",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27062",
            "name": "Mechanical Measurement & Metrology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26271",
            "name": "Electrical, Electronic & Vehicle Networking System",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26272",
            "name": "Automotive Testing & Emission Control",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26273",
            "name": "Shop Equipment, Service Station Operation & Workshop Practice",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26274",
            "name": "Automobile Engineering Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "27071",
            "name": "Design of Machine Elements",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29231",
            "name": "Mechatronics & PLC",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26281",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26281",
            "name": "Industrial Attachment (Project Presentation)",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Chemical_technology_dd069a38",
    "syntaxWarning": null,
    "department_name": "Chemical Technology",
    "department_code": "63",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26311",
            "name": "Chemical Engineering Fundamentals",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26312",
            "name": "Safety in Chemical Industry",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26321",
            "name": "Basic Stoichiometry",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26322",
            "name": "Chemical Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26331",
            "name": "Chemical Engineering Operation-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26332",
            "name": "Industrial Chemistry",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26333",
            "name": "Chemical Engineering Materials",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26341",
            "name": "Chemical Engineering Operation-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26342",
            "name": "Chemical Process Industries-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26343",
            "name": "Oil, Fats & Waxes",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26344",
            "name": "Analytical Chemistry",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "27041",
            "name": "Engineering Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26351",
            "name": "Chemical Engineering Operation-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26352",
            "name": "Chemical Process Industries-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26353",
            "name": "Water Treatment Technology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26354",
            "name": "Industrial Instrumentation & Process Control",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26355",
            "name": "Refrigeration & Cold Storage",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26356",
            "name": "Industrial Production Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26361",
            "name": "Chemical Engineering Operation-IV",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26362",
            "name": "Chemical Process Industries-III",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26363",
            "name": "Petroleum & Petrochemicals",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26364",
            "name": "Industrial Stoichiometry & Thermodynamics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26365",
            "name": "Instrumental Methods of Analysis",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26366",
            "name": "Jute & Textile Technology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26371",
            "name": "Chemical Engineering Operation-V",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26372",
            "name": "Chemical Process Industries-IV",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26373",
            "name": "Natural Gas & Fertilizer",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26374",
            "name": "Plastic & Polymer Technology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26375",
            "name": "Corrosion Technology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26376",
            "name": "Chemical Engineering Project",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26381",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26381",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Civil_technology_4cc2d527",
    "syntaxWarning": null,
    "department_name": "Civil Technology",
    "department_code": "64",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26411",
            "name": "Civil Engineering Materials",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26421",
            "name": "Civil Engineering Drawing",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26431",
            "name": "Structural Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26432",
            "name": "Surveying-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26433",
            "name": "Construction Process-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26441",
            "name": "Construction Process-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26442",
            "name": "Estimating & Costing-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26443",
            "name": "Civil CAD-I",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "26444",
            "name": "Surveying-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26445",
            "name": "Geotechnical Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26446",
            "name": "Hydrology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26521",
            "name": "Wood Workshop Practice",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26451",
            "name": "Foundation Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26452",
            "name": "Civil CAD-II",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26453",
            "name": "Surveying-III",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26454",
            "name": "Theory of Structure",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26455",
            "name": "Water Supply Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26456",
            "name": "Hydraulics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "26461",
            "name": "Water Resources Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26462",
            "name": "Advance Surveying",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26463",
            "name": "Transportation Engineering-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26464",
            "name": "Design of Structure-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28863",
            "name": "Steel Structures",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28861",
            "name": "Advanced Construction",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26471",
            "name": "Civil Engineering Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26472",
            "name": "Sanitary Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26473",
            "name": "Transportation Engineering-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26474",
            "name": "Design of Structure-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26475",
            "name": "Estimating & Costing-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28871",
            "name": "Construction Management & Documentation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26481",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26481",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Computer_science_and_technology_c37a3f34",
    "syntaxWarning": null,
    "department_name": "Computer Science & Technology",
    "department_code": "85",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28521",
            "name": "Python Programming",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28522",
            "name": "Computer Graphics Design-I",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28531",
            "name": "Application Development Using Python",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28532",
            "name": "Computer Graphics Design-II",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "28533",
            "name": "IT Support Services",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "26831",
            "name": "Digital Electronics-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28541",
            "name": "Java Programming",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28542",
            "name": "Data Structure & Algorithm",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28543",
            "name": "Computer Peripherals & Interfacing",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28544",
            "name": "Web Design & Development-I",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26841",
            "name": "Digital Electronics-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28551",
            "name": "Application Development Using Java",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28552",
            "name": "Web Design & Development-II",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "28553",
            "name": "Computer Architecture & Microprocessor",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28554",
            "name": "Data Communication",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28555",
            "name": "Operating System",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28556",
            "name": "Project Work-I",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28561",
            "name": "Database Management System",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28562",
            "name": "Computer Networking",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28563",
            "name": "Sensor & IoT System",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28564",
            "name": "Microcontroller Based System Design & Development",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "28565",
            "name": "Surveillance Security System",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "28566",
            "name": "Web Development Project",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 19,
        "total_marks": 950,
        "subjects": [
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28571",
            "name": "Digital Marketing Technique",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28572",
            "name": "Network Administration & Services",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28573",
            "name": "Cyber Security & Ethics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28574",
            "name": "Apps Development Project",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "28575",
            "name": "Multimedia & Animation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28576",
            "name": "Project Work-II",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "28581",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "28581",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Construction_technology_9dec085d",
    "syntaxWarning": null,
    "department_name": "Construction Technology",
    "department_code": "88",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26411",
            "name": "Civil Engineering Materials",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26421",
            "name": "Civil Engineering Drawing",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26431",
            "name": "Structural Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26432",
            "name": "Surveying-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "28831",
            "name": "Construction Methodology-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26442",
            "name": "Estimating & Costing-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26443",
            "name": "Civil CAD-I",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "26444",
            "name": "Surveying-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26445",
            "name": "Geotechnical Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26446",
            "name": "Hydrology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28841",
            "name": "Construction Methodology-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28842",
            "name": "Construction Safety",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26451",
            "name": "Foundation Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26452",
            "name": "Civil CAD-II",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26453",
            "name": "Surveying-III",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26454",
            "name": "Theory of Structure",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26455",
            "name": "Water Supply Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "26456",
            "name": "Hydraulics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26461",
            "name": "Water Resources Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26463",
            "name": "Transportation Engineering-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26464",
            "name": "Design of Structure-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28861",
            "name": "Advanced Construction",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28862",
            "name": "Building Facilities & Law",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28863",
            "name": "Steel Structures",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26472",
            "name": "Sanitary Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26473",
            "name": "Transportation Engineering-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26474",
            "name": "Design of Structure-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26475",
            "name": "Estimating & Costing-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28871",
            "name": "Construction Management & Documentation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28872",
            "name": "Construction Engineering Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "28881",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "28881",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Electrical_technology_32807ae9",
    "syntaxWarning": null,
    "department_name": "Electrical Technology",
    "department_code": "67",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26712",
            "name": "Electrical Engineering Materials",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26721",
            "name": "Electrical Circuits-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26722",
            "name": "Electrical Engineering Drawing",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 6,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26731",
            "name": "Electrical Circuits-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26732",
            "name": "Electrical Appliances",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26833",
            "name": "Industrial Electronics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26741",
            "name": "Electrical Installation, Planning and Estimating",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26742",
            "name": "DC Machine",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26743",
            "name": "Electrical Engineering Project-I",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26845",
            "name": "Digital Electronics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27044",
            "name": "Applied Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26751",
            "name": "Generation of Electrical Power",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26752",
            "name": "Electrical & Electronic Measurements-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26753",
            "name": "Testing and Maintenance of Electrical Equipments",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26754",
            "name": "Electrical Engineering Project-II",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26853",
            "name": "Microprocessor & Microcontroller",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 6,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "28567",
            "name": "Programming in C",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26761",
            "name": "AC Machine-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26762",
            "name": "Transmission and Distribution of Electrical Power-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26763",
            "name": "Electrical & Electronic Measurements-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26842",
            "name": "Communication Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26771",
            "name": "AC Machine-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26772",
            "name": "Transmission and Distribution of Electrical Power-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26773",
            "name": "Switch Gear and Protection",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26774",
            "name": "Electrical Engineering Project-III",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26875",
            "name": "Automation Engineering & PLC",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26781",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26781",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Electro_medical_technology_8662d2df",
    "syntaxWarning": null,
    "department_name": "Electromedical Technology",
    "department_code": "86",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 7,
        "periods_per_week": 27,
        "total_credits": 19,
        "total_marks": 950,
        "subjects": [
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28611",
            "name": "Human Anatomy and Physiology",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 7,
        "periods_per_week": 32,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26721",
            "name": "Electrical Circuits-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28621",
            "name": "Basic Biomedical Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26731",
            "name": "Electrical Circuits-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28631",
            "name": "Medical transducer and Sensors",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28632",
            "name": "Operating Room Equipment",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26741",
            "name": "Electrical Installation, Planning and Estimating",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26742",
            "name": "DC Machine",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26752",
            "name": "Electrical & Electronic Measurements-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26845",
            "name": "Digital Electronics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28641",
            "name": "Dental Equipment",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "28642",
            "name": "Anesthesia and Respiratory Equipment",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28567",
            "name": "Programming in C",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26761",
            "name": "AC Machine-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26763",
            "name": "Electrical & Electronic Measurements-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28651",
            "name": "Radiology and Imaging Equipment",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28652",
            "name": "Fibre Optics and Laser in Medical Field",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28653",
            "name": "Physiotherapy and Rehabilitation Devices",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "26764",
            "name": "Transmission and Distribution of Electrical Power",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26771",
            "name": "AC Machine-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28661",
            "name": "Diagnostic and Laboratory Equipment",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28662",
            "name": "Microprocessor and Biomedical Application",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28663",
            "name": "Testing and Maintenance Biomedical Equipment",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "28664",
            "name": "CAD in Biomedical Engineering",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26773",
            "name": "Switch Gear and Protection",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28671",
            "name": "Advance Biomedical Equipment",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28672",
            "name": "ICU and CCU Equipment",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28673",
            "name": "Biomedical Engineering Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "28674",
            "name": "Medical Physics and Nuclear Instruments",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "28681",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "28681",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Electronic_technology_aee360b9",
    "syntaxWarning": null,
    "department_name": "Electronics Technology",
    "department_code": "68",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 33,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26721",
            "name": "Electrical Circuits-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26821",
            "name": "Electronic Devices and Circuits",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 6,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26731",
            "name": "Electrical Circuits-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26831",
            "name": "Digital Electronics-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26832",
            "name": "Power Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26741",
            "name": "Electrical Installation, Planning and Estimating",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26742",
            "name": "DC Machine",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26841",
            "name": "Digital Electronics-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26842",
            "name": "Communication Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26843",
            "name": "Networks, Filters and Transmission lines",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26844",
            "name": "Electronic servicing",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28567",
            "name": "Programming in C",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26751",
            "name": "Generation of Electrical Power",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26752",
            "name": "Electrical & Electronic Measurements-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26851",
            "name": "Television Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26852",
            "name": "Electronic Appliances",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "28654",
            "name": "Bio-Medical Instruments",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "26761",
            "name": "AC Machine-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26764",
            "name": "Transmission and Distribution of Electrical Power",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26763",
            "name": "Electrical & Electronic Measurements-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26861",
            "name": "TV Studio and Broadcasting",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26862",
            "name": "Microcontroller and Embedded System",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26863",
            "name": "PCB Design and Prototyping",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26771",
            "name": "AC Machine-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26871",
            "name": "Microwave Radar and Navigation Aids",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26872",
            "name": "Industrial Automation and PLC",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26873",
            "name": "Control System and Robotics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26874",
            "name": "Electronic Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26881",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26881",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Environmental_technology_22725f8d",
    "syntaxWarning": null,
    "department_name": "Environmental Technology",
    "department_code": "90",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29011",
            "name": "Basic Environmental Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26421",
            "name": "Civil Engineering Drawing",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26411",
            "name": "Civil Engineering Materials",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26432",
            "name": "Surveying-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26433",
            "name": "Construction Process-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "29031",
            "name": "Water Quality Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26431",
            "name": "Structural Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26442",
            "name": "Estimating & Costing-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26443",
            "name": "Civil CAD-I",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "26444",
            "name": "Surveying-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26445",
            "name": "Geotechnical Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29042",
            "name": "Environmental Chemistry",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26441",
            "name": "Construction Process-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26454",
            "name": "Theory of Structure",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26455",
            "name": "Water Supply Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29051",
            "name": "Water and Waste Water Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29052",
            "name": "Environmental Microbiology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29053",
            "name": "Geographic Information System (GIS) & Remote Sensing",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26456",
            "name": "Hydraulics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26463",
            "name": "Transportation Engineering-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26464",
            "name": "Design of Structure-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29061",
            "name": "Environmental Impact Assessment (EIA) & Environmental Regulation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29062",
            "name": "Air Pollution & Control Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29063",
            "name": "Environmental Auditing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "29064",
            "name": "Health, Safety & Environment",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26472",
            "name": "Sanitary Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26475",
            "name": "Estimating & Costing-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28871",
            "name": "Construction Management & Documentation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29071",
            "name": "Energy & Environmental Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29072",
            "name": "Solid and Hazardous Waste Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29073",
            "name": "Climate Change and Adaptability",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "29081",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "29081",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Food_technology_558db1d9",
    "syntaxWarning": null,
    "department_name": "Food Technology",
    "department_code": "69",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26911",
            "name": "Food Engineering Fundamentals",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26912",
            "name": "Food Safety & Hygiene Management",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26921",
            "name": "Food Science & Nutrition",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26922",
            "name": "Food Plant Layout & Design",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26931",
            "name": "Catering Management",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26932",
            "name": "Food Industrial Chemistry",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26941",
            "name": "Food Microbiology-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26942",
            "name": "Food Preservation-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26943",
            "name": "Food Chemistry",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26944",
            "name": "Food Packaging",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26945",
            "name": "Dairy Products",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27041",
            "name": "Engineering Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26355",
            "name": "Refrigeration & Cold Storage",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26951",
            "name": "Food Microbiology-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26952",
            "name": "Food Preservation-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26953",
            "name": "Food Biotechnology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26954",
            "name": "Food & Beverage Products",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26955",
            "name": "Food Industrial Instrumentation & Process Control",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "26364",
            "name": "Industrial Stoichiometry & Thermodynamics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26365",
            "name": "Instrumental Methods of Analysis",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26961",
            "name": "Food Engineering Operation-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26962",
            "name": "Food Process Industries-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26963",
            "name": "Bakery Products",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26964",
            "name": "Food Adulteration & Toxicology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26971",
            "name": "Food Engineering Operation-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26972",
            "name": "Food Process Industries-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26973",
            "name": "Food Quality Control & Assurance",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26974",
            "name": "Confectionery Products",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26975",
            "name": "Food Analysis",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26976",
            "name": "Food Engineering Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26981",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26981",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Mechanical_technology_7d8e6cd9",
    "syntaxWarning": null,
    "department_name": "Mechanical Technology",
    "department_code": "70",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 19,
        "total_marks": 950,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "27012",
            "name": "Machine Shop Practice-I",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27021",
            "name": "Mechanical Engineering Drawing",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 30,
        "total_credits": 18,
        "total_marks": 900,
        "subjects": [
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27031",
            "name": "Mechanical Engineering Materials",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27032",
            "name": "Machine Shop Practice-II",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27231",
            "name": "RAC Cycles and Components",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27041",
            "name": "Engineering Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27042",
            "name": "Machine Shop Practice III",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27043",
            "name": "Metallurgy",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27131",
            "name": "Engineering Thermodynamics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27051",
            "name": "Fluid Mechanics & Machineries",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27052",
            "name": "Mechanical Estimating & Costing",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27053",
            "name": "Advanced Welding-I",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "27054",
            "name": "Foundry & Pattern Making",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27055",
            "name": "Manufacturing Process",
            "credit": 3,
            "theory_per_week": 3,
            "practical_per_week": 0,
            "marks": 150
          },
          {
            "code": "28567",
            "name": "Programming in C",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26211",
            "name": "Automobile Fundamentals",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27061",
            "name": "Strength of Materials",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27062",
            "name": "Mechanical Measurement & Metrology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27063",
            "name": "CAD & CAM",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27064",
            "name": "Advanced Welding-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27065",
            "name": "Plant Engineering & Maintainance",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27071",
            "name": "Design of Machine Elements",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27072",
            "name": "Tool Design",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27073",
            "name": "Heat Treatment of Metal",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27074",
            "name": "Mechanical Engineering Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "27075",
            "name": "Production Planning & Control",
            "credit": 3,
            "theory_per_week": 3,
            "practical_per_week": 0,
            "marks": 150
          },
          {
            "code": "29231",
            "name": "Mechatronics & PLC",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "27081",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "27081",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Power_technology_266d0d46",
    "syntaxWarning": null,
    "department_name": "Power Technology",
    "department_code": "71",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27111",
            "name": "Power Engineering Fundamental",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "27121",
            "name": "Power Equipment Management & Safety",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 6,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27012",
            "name": "Machine Shop Practice-I",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27131",
            "name": "Engineering Thermodynamics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27231",
            "name": "RAC Cycles and Components",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27041",
            "name": "Engineering Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27043",
            "name": "Metallurgy",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27141",
            "name": "IC Engine Details",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "27142",
            "name": "Fuels & Lubricants",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26262",
            "name": "Suspension, Brake, Steering & Transmission System of Vehicle",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28567",
            "name": "Programming in C",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26241",
            "name": "Automotive Body Building",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27051",
            "name": "Fluid Mechanics & Machineries",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27053",
            "name": "Advanced Welding-I",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "27151",
            "name": "Automotive Electricity, Electronics & Automation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27152",
            "name": "Power Plant Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 6,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "26764",
            "name": "Transmission and Distribution of Electrical Power",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27061",
            "name": "Strength of Materials",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27062",
            "name": "Mechanical Measurement & Metrology",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27065",
            "name": "Plant Engineering & Maintainance",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27161",
            "name": "Engine Overhauling, Inspection & Testing",
            "credit": 4,
            "theory_per_week": 2,
            "practical_per_week": 6,
            "marks": 200
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27071",
            "name": "Design of Machine Elements",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27073",
            "name": "Heat Treatment of Metal",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27171",
            "name": "Service Station Operation & Estimating",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27172",
            "name": "Hybrid & Electric Vehicle",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27173",
            "name": "Power Engineering Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "27181",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "27181",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Refrigerator_technology_83a0043e",
    "syntaxWarning": null,
    "department_name": "Refrigeration and Air Conditioning Technology",
    "department_code": "72",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 8,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27011",
            "name": "Basic Workshop Practice",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "27211",
            "name": "RAC Fundamental",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27021",
            "name": "Mechanical Engineering Drawing",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27031",
            "name": "Mechanical Engineering Materials",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 23,
        "total_marks": 1150,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26211",
            "name": "Automobile Fundamentals",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27131",
            "name": "Engineering Thermodynamics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27231",
            "name": "RAC Cycles and Components",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 35,
        "total_credits": 19,
        "total_marks": 950,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27012",
            "name": "Machine Shop Practice-I",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27041",
            "name": "Engineering Mechanics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27241",
            "name": "Circuits and Electrical Machine in RAC",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27242",
            "name": "Transport RAC",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27043",
            "name": "Metallurgy",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27051",
            "name": "Fluid Mechanics & Machineries",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27052",
            "name": "Mechanical Estimating & Costing",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27251",
            "name": "Heating Ventilation & Air Conditioning (HVAC)",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27252",
            "name": "Commercial & Industrial RAC",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "28567",
            "name": "Programming in C",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27055",
            "name": "Manufacturing Process",
            "credit": 3,
            "theory_per_week": 3,
            "practical_per_week": 0,
            "marks": 150
          },
          {
            "code": "27061",
            "name": "Strength of Materials",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27063",
            "name": "CAD & CAM",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          },
          {
            "code": "27065",
            "name": "Plant Engineering & Maintainance",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27261",
            "name": "Cooling & Heating Load Calculation",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27262",
            "name": "RAC Plant Installation Maintenance & Operation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "27075",
            "name": "Production Planning & Control",
            "credit": 3,
            "theory_per_week": 3,
            "practical_per_week": 0,
            "marks": 150
          },
          {
            "code": "27271",
            "name": "RAC System Analysis",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "27272",
            "name": "RAC Project",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "27273",
            "name": "Advance RAC",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "27274",
            "name": "RAC for Food Preservation",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29231",
            "name": "Mechatronics & PLC",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "27281",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "27281",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  },
  {
    "source_file": "Telecommunication_technology_dc2b0c9f",
    "syntaxWarning": null,
    "department_name": "Telecommunication Technology",
    "department_code": "94",
    "regulation": "2022",
    "semesters": [
      {
        "semester": "1st Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "21011",
            "name": "Engineering Drawing",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "25711",
            "name": "Bangla-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25712",
            "name": "English-I",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25911",
            "name": "Mathematics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25912",
            "name": "Physics -I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26711",
            "name": "Basic Electricity",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29411",
            "name": "Basics of Telecommunication",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "2nd Semester",
        "total_subjects": 8,
        "periods_per_week": 32,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25721",
            "name": "Bangla -II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25722",
            "name": "English-II",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25811",
            "name": "Social Science",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25812",
            "name": "Physical Education & Life Skills Development",
            "credit": 1,
            "theory_per_week": 0,
            "practical_per_week": 3,
            "marks": 50
          },
          {
            "code": "25921",
            "name": "Mathematics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25922",
            "name": "Physics-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26721",
            "name": "Electrical Circuits-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26811",
            "name": "Basic Electronics",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "3rd Semester",
        "total_subjects": 6,
        "periods_per_week": 35,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25913",
            "name": "Chemistry",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "25931",
            "name": "Mathematics-III",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "28511",
            "name": "Computer Office Application",
            "credit": 2,
            "theory_per_week": 0,
            "practical_per_week": 6,
            "marks": 100
          },
          {
            "code": "26731",
            "name": "Electrical Circuits-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26821",
            "name": "Electronic Devices and Circuits",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29431",
            "name": "Telecom Workshop and Outside Plant",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "4th Semester",
        "total_subjects": 7,
        "periods_per_week": 33,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25841",
            "name": "Accounting",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "28567",
            "name": "Programming in C",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26741",
            "name": "Electrical Installation, Planning and Estimating",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26845",
            "name": "Digital Electronics",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29441",
            "name": "Radio and TV Engineering",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29442",
            "name": "IT Support and IoT Basics",
            "credit": 2,
            "theory_per_week": 1,
            "practical_per_week": 3,
            "marks": 100
          },
          {
            "code": "29443",
            "name": "Data Communications and Networking",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "5th Semester",
        "total_subjects": 7,
        "periods_per_week": 34,
        "total_credits": 22,
        "total_marks": 1100,
        "subjects": [
          {
            "code": "25851",
            "name": "Principles of Marketing",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25852",
            "name": "Industrial Management",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26742",
            "name": "DC Machine",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26751",
            "name": "Generation of Electrical Power",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26752",
            "name": "Electrical & Electronic Measurements-I",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26853",
            "name": "Microprocessor & Microcontroller",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29451",
            "name": "Multimedia and Webpage Design",
            "credit": 3,
            "theory_per_week": 1,
            "practical_per_week": 6,
            "marks": 150
          }
        ]
      },
      {
        "semester": "6th Semester",
        "total_subjects": 6,
        "periods_per_week": 32,
        "total_credits": 20,
        "total_marks": 1000,
        "subjects": [
          {
            "code": "26761",
            "name": "AC Machine-I",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26763",
            "name": "Electrical & Electronic Measurements-II",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "26764",
            "name": "Transmission and Distribution of Electrical Power",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29041",
            "name": "Environmental Studies",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29462",
            "name": "Wireless and Mobile Communication",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29463",
            "name": "Signals and Switching System",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "7th Semester",
        "total_subjects": 7,
        "periods_per_week": 31,
        "total_credits": 21,
        "total_marks": 1050,
        "subjects": [
          {
            "code": "25831",
            "name": "Business Communication",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "25853",
            "name": "Innovation & Entrepreneurship",
            "credit": 2,
            "theory_per_week": 2,
            "practical_per_week": 0,
            "marks": 100
          },
          {
            "code": "26771",
            "name": "AC Machine-II",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "26773",
            "name": "Switch Gear and Protection",
            "credit": 4,
            "theory_per_week": 3,
            "practical_per_week": 3,
            "marks": 200
          },
          {
            "code": "29471",
            "name": "Microwave Engineering and Antennas",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29472",
            "name": "Optical Fiber Communication",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          },
          {
            "code": "29473",
            "name": "Satellite Communication and RADAR",
            "credit": 3,
            "theory_per_week": 2,
            "practical_per_week": 3,
            "marks": 150
          }
        ]
      },
      {
        "semester": "8th Semester",
        "total_subjects": 2,
        "periods_per_week": 36,
        "total_credits": 12,
        "total_marks": 600,
        "subjects": [
          {
            "code": "26781",
            "name": "Industrial Attachment",
            "credit": 8,
            "theory_per_week": 0,
            "practical_per_week": 24,
            "marks": 400
          },
          {
            "code": "26781",
            "name": "Project Presentation",
            "credit": 4,
            "theory_per_week": 0,
            "practical_per_week": 12,
            "marks": 200
          }
        ]
      }
    ]
  }
];
