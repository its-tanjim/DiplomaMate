import { CollegeItem, TechnologyItem } from '../types';
import { UPLOADED_DEPARTMENT_DATASETS } from './uploadedDepartmentDatasets';

export const COLLEGES_DIRECTORY: CollegeItem[] = [
  {
    id: 'clg_dhaka',
    name: 'Dhaka Polytechnic Institute',
    shortName: 'DPI',
    aliases: ['Dhaka Polytechnic Institute (DPI), Tejgaon', 'DPI', 'Dhaka Polytechnic', 'Tejgaon'],
    district: 'Dhaka',
    division: 'Dhaka'
  },
  {
    id: 'clg_chattogram',
    name: 'Chattogram Polytechnic Institute (Chittagong)',
    shortName: 'CPI',
    aliases: ['Chittagong Polytechnic Institute (CPI), Nasirabad', 'Chittagong Polytechnic Institute', 'CPI', 'Chattogram Polytechnic', 'Nasirabad', 'Chittagong'],
    district: 'Chattogram',
    division: 'Chattogram'
  },
  {
    id: 'clg_rajshahi',
    name: 'Rajshahi Polytechnic Institute',
    shortName: 'RPI',
    aliases: ['Rajshahi Polytechnic Institute (RPI)', 'RPI', 'Rajshahi'],
    district: 'Rajshahi',
    division: 'Rajshahi'
  },
  {
    id: 'clg_khulna',
    name: 'Khulna Polytechnic Institute',
    shortName: 'KPI',
    aliases: ['Khulna Polytechnic Institute (KPI)', 'KPI', 'Khulna'],
    district: 'Khulna',
    division: 'Khulna'
  },
  {
    id: 'clg_barishal',
    name: 'Barishal Polytechnic Institute',
    shortName: 'BPI',
    aliases: ['Barisal Polytechnic Institute (BPI)', 'Barisal Polytechnic Institute', 'BPI Barishal', 'Barisal', 'Barishal'],
    district: 'Barishal',
    division: 'Barishal'
  },
  {
    id: 'clg_sylhet',
    name: 'Sylhet Polytechnic Institute',
    shortName: 'SPI',
    aliases: ['Sylhet Polytechnic Institute (SPI)', 'SPI', 'Sylhet'],
    district: 'Sylhet',
    division: 'Sylhet'
  },
  {
    id: 'clg_rangpur',
    name: 'Rangpur Polytechnic Institute',
    shortName: 'RPI Rangpur',
    aliases: ['Rangpur Polytechnic Institute', 'Rangpur'],
    district: 'Rangpur',
    division: 'Rangpur'
  },
  {
    id: 'clg_mymensingh',
    name: 'Mymensingh Polytechnic Institute',
    shortName: 'MPI',
    aliases: ['Mymensingh Polytechnic Institute', 'MPI', 'Mymensingh'],
    district: 'Mymensingh',
    division: 'Mymensingh'
  },
  {
    id: 'clg_bogura',
    name: 'Bogura Polytechnic Institute (Bogra)',
    shortName: 'BPI Bogra',
    aliases: ['Bogra Polytechnic Institute', 'Bogura Polytechnic Institute', 'Bogra', 'Bogura'],
    district: 'Bogura',
    division: 'Rajshahi'
  },
  {
    id: 'clg_pabna',
    name: 'Pabna Polytechnic Institute',
    shortName: 'PPI',
    aliases: ['Pabna Polytechnic Institute', 'PPI', 'Pabna'],
    district: 'Pabna',
    division: 'Rajshahi'
  },
  {
    id: 'clg_jashore',
    name: 'Jashore Polytechnic Institute (Jessore)',
    shortName: 'JPI',
    aliases: ['Jessore Polytechnic Institute', 'Jashore Polytechnic Institute', 'Jessore', 'Jashore'],
    district: 'Jashore',
    division: 'Khulna'
  },
  {
    id: 'clg_comilla',
    name: 'Comilla Polytechnic Institute',
    shortName: 'CPI Comilla',
    aliases: ['Comilla Polytechnic Institute', 'Cumilla Polytechnic Institute', 'Comilla', 'Cumilla'],
    district: 'Cumilla',
    division: 'Chattogram'
  },
  {
    id: 'clg_dinajpur',
    name: 'Dinajpur Polytechnic Institute',
    shortName: 'DPI Dinajpur',
    aliases: ['Dinajpur Polytechnic Institute', 'Dinajpur'],
    district: 'Dinajpur',
    division: 'Rangpur'
  },
  {
    id: 'clg_faridpur',
    name: 'Faridpur Polytechnic Institute',
    shortName: 'FPI Faridpur',
    aliases: ['Faridpur Polytechnic Institute', 'Faridpur'],
    district: 'Faridpur',
    division: 'Dhaka'
  },
  {
    id: 'clg_feni',
    name: 'Feni Polytechnic Institute',
    shortName: 'FPI Feni',
    aliases: ['Feni Polytechnic Institute', 'Feni'],
    district: 'Feni',
    division: 'Chattogram'
  },
  {
    id: 'clg_kushtia',
    name: 'Kushtia Polytechnic Institute',
    shortName: 'KPI Kushtia',
    aliases: ['Kushtia Polytechnic Institute', 'Kushtia'],
    district: 'Kushtia',
    division: 'Khulna'
  },
  {
    id: 'clg_tangail',
    name: 'Tangail Polytechnic Institute',
    shortName: 'TPI',
    aliases: ['Tangail Polytechnic Institute', 'Tangail'],
    district: 'Tangail',
    division: 'Dhaka'
  },
  {
    id: 'clg_patuakhali',
    name: 'Patuakhali Polytechnic Institute',
    shortName: 'PPI Patuakhali',
    aliases: ['Patuakhali Polytechnic Institute', 'Patuakhali'],
    district: 'Patuakhali',
    division: 'Barishal'
  },
  {
    id: 'clg_barguna',
    name: 'Barguna Polytechnic Institute',
    aliases: ['Barguna Polytechnic Institute', 'Barguna'],
    district: 'Barguna',
    division: 'Barishal'
  },
  {
    id: 'clg_bhola',
    name: 'Bhola Polytechnic Institute',
    aliases: ['Bhola Polytechnic Institute', 'Bhola'],
    district: 'Bhola',
    division: 'Barishal'
  },
  {
    id: 'clg_brahmanbaria',
    name: 'Brahmanbaria Polytechnic Institute',
    aliases: ['Brahmanbaria Polytechnic Institute', 'Brahmanbaria'],
    district: 'Brahmanbaria',
    division: 'Chattogram'
  },
  {
    id: 'clg_chandpur',
    name: 'Chandpur Polytechnic Institute',
    aliases: ['Chandpur Polytechnic Institute', 'Chandpur'],
    district: 'Chandpur',
    division: 'Chattogram'
  },
  {
    id: 'clg_chapainawabganj',
    name: 'Chapainawabganj Polytechnic Institute',
    aliases: ['Chapainawabganj Polytechnic Institute', 'Chapai Nawabganj', 'Chapainawabganj'],
    district: 'Chapainawabganj',
    division: 'Rajshahi'
  },
  {
    id: 'clg_coxsbazar',
    name: 'Cox\'s Bazar Polytechnic Institute',
    aliases: ['Cox\'s Bazar Polytechnic Institute', 'Coxs Bazar', 'Coxsbazar'],
    district: 'Cox\'s Bazar',
    division: 'Chattogram'
  },
  {
    id: 'clg_gopalganj',
    name: 'Gopalganj Polytechnic Institute',
    aliases: ['Gopalganj Polytechnic Institute', 'Gopalganj'],
    district: 'Gopalganj',
    division: 'Dhaka'
  },
  {
    id: 'clg_habiganj',
    name: 'Habiganj Polytechnic Institute',
    aliases: ['Habiganj Polytechnic Institute', 'Habiganj'],
    district: 'Habiganj',
    division: 'Sylhet'
  },
  {
    id: 'clg_jhenaidah',
    name: 'Jhenaidah Polytechnic Institute',
    aliases: ['Jhenaidah Polytechnic Institute', 'Jhenaidah', 'Jhenaidaha'],
    district: 'Jhenaidah',
    division: 'Khulna'
  },
  {
    id: 'clg_kishoreganj',
    name: 'Kishoreganj Polytechnic Institute',
    aliases: ['Kishoreganj Polytechnic Institute', 'Kishoreganj'],
    district: 'Kishoreganj',
    division: 'Dhaka'
  },
  {
    id: 'clg_kurigram',
    name: 'Kurigram Polytechnic Institute',
    aliases: ['Kurigram Polytechnic Institute', 'Kurigram'],
    district: 'Kurigram',
    division: 'Rangpur'
  },
  {
    id: 'clg_lakshmipur',
    name: 'Lakshmipur Polytechnic Institute (Laxmipur)',
    shortName: 'Laxmipur PI',
    aliases: ['Laxmipur Polytechnic Institute', 'Lakshmipur Polytechnic Institute', 'Laxmipur', 'Lakshmipur'],
    district: 'Lakshmipur',
    division: 'Chattogram'
  },
  {
    id: 'clg_magura',
    name: 'Magura Polytechnic Institute',
    aliases: ['Magura Polytechnic Institute', 'Magura'],
    district: 'Magura',
    division: 'Khulna'
  },
  {
    id: 'clg_moulvibazar',
    name: 'Moulvibazar Polytechnic Institute',
    aliases: ['Moulvibazar Polytechnic Institute', 'Maulvibazar', 'Moulvibazar'],
    district: 'Moulvibazar',
    division: 'Sylhet'
  },
  {
    id: 'clg_munshiganj',
    name: 'Munshiganj Polytechnic Institute',
    aliases: ['Munshiganj Polytechnic Institute', 'Munshiganj'],
    district: 'Munshiganj',
    division: 'Dhaka'
  },
  {
    id: 'clg_narsingdi',
    name: 'Narsingdi Polytechnic Institute',
    aliases: ['Narsingdi Polytechnic Institute', 'Narsingdi'],
    district: 'Narsingdi',
    division: 'Dhaka'
  },
  {
    id: 'clg_naogaon',
    name: 'Naogaon Polytechnic Institute',
    aliases: ['Naogaon Polytechnic Institute', 'Naogaon'],
    district: 'Naogaon',
    division: 'Rajshahi'
  },
  {
    id: 'clg_narayanganj',
    name: 'Narayanganj Polytechnic Institute',
    aliases: ['Narayanganj Polytechnic Institute', 'Narayanganj'],
    district: 'Narayanganj',
    division: 'Dhaka'
  },
  {
    id: 'clg_satkhira',
    name: 'Satkhira Polytechnic Institute',
    aliases: ['Satkhira Polytechnic Institute', 'Satkhira'],
    district: 'Satkhira',
    division: 'Khulna'
  },
  {
    id: 'clg_shariatpur',
    name: 'Shariatpur Polytechnic Institute',
    aliases: ['Shariatpur Polytechnic Institute', 'Shariatpur'],
    district: 'Shariatpur',
    division: 'Dhaka'
  },
  {
    id: 'clg_sherpur',
    name: 'Sherpur Polytechnic Institute',
    aliases: ['Sherpur Polytechnic Institute', 'Sherpur'],
    district: 'Sherpur',
    division: 'Mymensingh'
  },
  {
    id: 'clg_sirajganj',
    name: 'Sirajganj Polytechnic Institute',
    aliases: ['Sirajganj Polytechnic Institute', 'Sirajganj'],
    district: 'Sirajganj',
    division: 'Rajshahi'
  },
  {
    id: 'clg_thakurgaon',
    name: 'Thakurgaon Polytechnic Institute',
    aliases: ['Thakurgaon Polytechnic Institute', 'Thakurgaon'],
    district: 'Thakurgaon',
    division: 'Rangpur'
  },
  {
    id: 'clg_bspi_kaptai',
    name: 'Bangladesh Sweden Polytechnic Institute (Kaptai)',
    shortName: 'BSPI',
    aliases: ['BSPI', 'Kaptai Polytechnic', 'Bangladesh Sweden Polytechnic', 'Kaptai', 'Rangamati'],
    district: 'Rangamati',
    division: 'Chattogram'
  },
  {
    id: 'clg_dhaka_mohila',
    name: 'Dhaka Mohila Polytechnic Institute',
    shortName: 'DMPI',
    aliases: ['Dhaka Mohila Polytechnic Institute (DMPI)', 'DMPI', 'Dhaka Mohila', 'Agargaon Mohila'],
    district: 'Dhaka',
    division: 'Dhaka',
    isWomenOnly: true
  },
  {
    id: 'clg_chattogram_mohila',
    name: 'Chattogram Mohila Polytechnic Institute (Chittagong)',
    shortName: 'CMPI',
    aliases: ['Chittagong Mohila Polytechnic Institute', 'Chattogram Mohila', 'CMPI', 'Chittagong Mohila'],
    district: 'Chattogram',
    division: 'Chattogram',
    isWomenOnly: true
  },
  {
    id: 'clg_khulna_mohila',
    name: 'Khulna Mohila Polytechnic Institute',
    shortName: 'KMPI',
    aliases: ['Khulna Mohila Polytechnic Institute', 'Khulna Mohila', 'KMPI'],
    district: 'Khulna',
    division: 'Khulna',
    isWomenOnly: true
  },
  {
    id: 'clg_rajshahi_mohila',
    name: 'Rajshahi Mohila Polytechnic Institute',
    shortName: 'RMPI',
    aliases: ['Rajshahi Mohila Polytechnic Institute', 'Rajshahi Mohila', 'RMPI'],
    district: 'Rajshahi',
    division: 'Rajshahi',
    isWomenOnly: true
  }
];

export const TECHNOLOGIES_DIRECTORY: TechnologyItem[] = [
  {
    id: 'tech_civil',
    name: 'Civil Technology',
    shortCode: 'CIVIL',
    aliases: ['Civil', 'Civil Engineering'],
    semestersCurriculum: {
      1: ['Engineering Drawing (66411)', 'Civil Engineering Materials (66412)', 'Mathematics-1 (65911)', 'Physics-1 (65912)', 'English (65712)'],
      2: ['Surveying-1 (66421)', 'Construction Process-1 (66422)', 'Mathematics-2 (65921)', 'Chemistry (65913)', 'Social Science (65811)'],
      3: ['Surveying-2 (66431)', 'Mechanics of Structures (66432)', 'Construction Process-2 (66433)', 'Mathematics-3 (65931)'],
      4: ['Structural Mechanics (66441)', 'Theory of Structure (66442)', 'Environmental Studies (69054)', 'Estimating & Costing-1 (66444)'],
      5: ['Foundation Engineering (66451)', 'Design of Structure-1 (66452)', 'Transportation Engineering-1 (66453)', 'Water Resources Engineering (66454)'],
      6: ['Design of Structure-2 (66461)', 'Transportation Engineering-2 (66462)', 'Estimating & Costing-2 (66463)', 'Civil Project & Internship (66464)'],
      7: ['Civil Engineering Drawing-3 (CAD) (66471)', 'Design of Steel Structure (66472)', 'Construction Management (66473)'],
      8: ['Industrial Training / Internship (66481)']
    }
  },
  {
    id: 'tech_electrical',
    name: 'Electrical Technology',
    shortCode: 'ELECTRICAL',
    aliases: ['Electrical', 'EEE', 'Electrical Engineering'],
    semestersCurriculum: {
      1: ['Basic Electricity (66711)', 'Electrical Engineering Drawing (66712)', 'Mathematics-1 (65911)', 'Physics-1 (65912)', 'English (65712)'],
      2: ['Electrical Circuits-1 (66721)', 'Electrical Appliances (66722)', 'Mathematics-2 (65921)', 'Chemistry (65913)'],
      3: ['Electrical Circuits-2 (66731)', 'Electrical Machines-1 (66732)', 'Electronics-1 (66831)', 'Mathematics-3 (65931)'],
      4: ['Electrical Machines-2 (66741)', 'Generation of Electrical Power (66742)', 'Industrial Electronics (66842)'],
      5: ['Transmission & Distribution-1 (66751)', 'Switchgear & Protection (66752)', 'AC Machines (66753)'],
      6: ['Transmission & Distribution-2 (66761)', 'Electrical Substation Design (66762)', 'Industrial Management (65852)'],
      7: ['Power System Protection (66771)', 'Smart Grid Technology (66772)', 'Energy Audit & Management (66773)'],
      8: ['Industrial Attachment / Internship (66781)']
    }
  },
  {
    id: 'tech_mechanical',
    name: 'Mechanical Technology',
    shortCode: 'MECH',
    aliases: ['Mechanical', 'Mechanical Engineering'],
    semestersCurriculum: {
      1: ['Mechanical Workshop Practice (67011)', 'Engineering Drawing (67012)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Machine Shop Practice-1 (67021)', 'Foundry & Pattern Making (67022)', 'Mathematics-2 (65921)', 'Chemistry (65913)'],
      3: ['Machine Shop Practice-2 (67031)', 'Thermodynamics (67032)', 'Strength of Materials (67033)', 'Mathematics-3 (65931)'],
      4: ['Hydraulics & Fluid Mechanics (67041)', 'Manufacturing Process (67042)', 'CAD in Mechanical (67043)'],
      5: ['Power Plant Engineering (67051)', 'Tool Design (67052)', 'Metrology & Quality Control (67053)'],
      6: ['Heat Engine & Thermal Power (67061)', 'Automotive Systems (67062)', 'Industrial Management (65852)'],
      7: ['Refrigeration & Heat Transfer (67071)', 'Mechatronics Systems (67072)', 'Mechanical Project (67073)'],
      8: ['Industrial Attachment (67081)']
    }
  },
  {
    id: 'tech_cst',
    name: 'Computer Science and Technology (CST)',
    shortCode: 'CST',
    aliases: ['Computer Science & Technology (CST)', 'Computer Science & Technology', 'Computer Science and Technology', 'Computer Technology', 'CSE', 'CST'],
    semestersCurriculum: {
      1: ['Computer Fundamentals & Application (66611)', 'Engineering Drawing (61011)', 'Mathematics-1 (65911)', 'Physics-1 (65912)', 'English (65712)', 'Bangla (65711)'],
      2: ['Programming Essentials (Python/C) (66621)', 'Computer Graphics (66622)', 'Mathematics-2 (65921)', 'Chemistry (65913)', 'Physical Education (65812)'],
      3: ['Data Structures & Algorithm (66631)', 'Digital Electronics (66831)', 'Object Oriented Programming (Java) (66632)', 'Mathematics-3 (65931)', 'Social Science (65811)'],
      4: ['Database Management System (66641)', 'Computer Peripherals & Interfacing (66642)', 'Data Communication (66643)', 'Web Development-1 (66644)'],
      5: ['Operating System (66651)', 'Computer Architecture (66652)', 'Java Programming (66653)', 'Software Engineering (66654)', 'Microcontroller Systems (66655)'],
      6: ['Web Development Project (66661)', 'Microprocessor & Interfacing (66662)', 'Surveillance & Security System (66663)', 'Database Management System (66664)', 'Data Communication & Networking (66665)', 'Industrial Management (65852)'],
      7: ['System Analysis & Design (66671)', 'Network Administration & Security (66672)', 'Mobile Application Development (66673)', 'Cloud Computing & Cyber Security (66674)', 'Project & Presentation (66675)'],
      8: ['Industrial Attachment / Internship (66681)']
    }
  },
  {
    id: 'tech_electronics',
    name: 'Electronics Technology',
    shortCode: 'ENT',
    aliases: ['Electronics', 'Electronics Engineering'],
    semestersCurriculum: {
      1: ['Basic Electronics (66811)', 'Electrical Circuits-1 (66711)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Electronic Devices & Circuits (66821)', 'Digital Electronics-1 (66822)', 'Mathematics-2 (65921)', 'Chemistry (65913)'],
      3: ['Digital Electronics-2 (66831)', 'Analog Communication (66832)', 'Electrical Measurement (66731)'],
      4: ['Microcontroller & Embedded Systems (66841)', 'Power Electronics (66842)', 'PCB Design (66843)'],
      5: ['Digital Communication (66851)', 'Robotics & Automation (66852)', 'Biomedical Electronics (66853)'],
      6: ['Wireless & Mobile Communication (66861)', 'VLSI Design Basics (66862)', 'Industrial Management (65852)'],
      7: ['Optical Fiber Communication (66871)', 'Sensor & Instrumentation (66872)', 'Project (66873)'],
      8: ['Industrial Internship (66881)']
    }
  },
  {
    id: 'tech_architecture',
    name: 'Architecture Technology',
    shortCode: 'ARCH',
    aliases: ['Architecture', 'Architectural Engineering'],
    semestersCurriculum: {
      1: ['Architectural Graphics-1 (66111)', 'Basic Design (66112)', 'Mathematics-1 (65911)', 'English (65712)'],
      2: ['Architectural Graphics-2 (66121)', 'Building Construction-1 (66122)', 'Mathematics-2 (65921)'],
      3: ['Architectural Design-1 (66131)', 'History of Architecture-1 (66132)', 'Building Materials (66133)'],
      4: ['Architectural Design-2 (66141)', 'Computer Aided Architectural Drawing (66142)', 'Climatology (66143)'],
      5: ['Architectural Design-3 (66151)', 'Urban Planning Basics (66152)', 'Landscape Architecture (66153)'],
      6: ['Architectural Design-4 (66161)', 'Interior Architecture (66162)', 'Building Services & Acoustics (66163)'],
      7: ['Comprehensive Architectural Project (66171)', 'Professional Practice & Building Codes (66172)'],
      8: ['Professional Internship (66181)']
    }
  },
  {
    id: 'tech_automobile',
    name: 'Automobile Technology',
    shortCode: 'AUTO',
    aliases: ['Automobile', 'Auto Engineering', 'Automotive'],
    semestersCurriculum: {
      1: ['Automotive Workshop (66211)', 'Engineering Drawing (66212)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Internal Combustion Engine-1 (66221)', 'Automotive Fuel Systems (66222)', 'Mathematics-2 (65921)'],
      3: ['Internal Combustion Engine-2 (66231)', 'Automotive Transmission (66232)', 'Auto Electricity (66233)'],
      4: ['Automotive Steering & Suspension (66241)', 'Automotive Brake Systems (66242)', 'Vehicle Dynamics (66243)'],
      5: ['Automotive Electronics & ECU (66251)', 'Electric & Hybrid Vehicles (66252)', 'Diesel Injection Systems (66253)'],
      6: ['Vehicle Testing & Diagnostics (66261)', 'Motor Vehicle Regulations & Inspection (66262)', 'Industrial Management (65852)'],
      7: ['Automobile Trouble Shooting & Overhauling (66271)', 'Auto CAD & Design (66272)'],
      8: ['Industrial Internship (66281)']
    }
  },
  {
    id: 'tech_power',
    name: 'Power Technology',
    shortCode: 'POWER',
    aliases: ['Power', 'Power Engineering'],
    semestersCurriculum: {
      1: ['Basic Power Plant (67111)', 'Mechanical Drawing (67112)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Thermal Power Generation (67121)', 'Electrical Machines (67122)', 'Mathematics-2 (65921)'],
      3: ['Boiler & Steam Turbine (67131)', 'Gas Turbine & Combined Cycle (67132)', 'Fluid Mechanics (67133)'],
      4: ['Renewable Energy Systems (67141)', 'Solar & Wind Power (67142)', 'Power Station Instrumentation (67143)'],
      5: ['Nuclear Power Basics (67151)', 'Hydroelectric Engineering (67152)', 'Substation & Grid Operations (67153)'],
      6: ['Power Plant Economics & Safety (67161)', 'Transmission Engineering (67162)', 'Industrial Management (65852)'],
      7: ['Smart Grid & Energy Storage (67171)', 'Power Project & Simulation (67172)'],
      8: ['Power Station Industrial Internship (67181)']
    }
  },
  {
    id: 'tech_rac',
    name: 'Refrigeration and Air Conditioning (RAC) Technology',
    shortCode: 'RAC',
    aliases: [
      'RAC',
      'Refrigeration',
      'Air Conditioning',
      'HVAC',
      'Refrigeration and Air Conditioning Technology',
      'Refrigeration & Air Conditioning Technology',
      'Refrigeration and Air Conditioning (RAC) Technology'
    ],
    semestersCurriculum: {
      1: ['Fundamentals of RAC (67211)', 'RAC Workshop (67212)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Domestic Refrigerators & Freezers (67221)', 'Thermodynamics of RAC (67222)', 'Mathematics-2 (65921)'],
      3: ['Commercial Refrigeration Systems (67231)', 'Psychrometry & Air Distribution (67232)', 'RAC Electrical Controls (67233)'],
      4: ['Central Air Conditioning Systems (67241)', 'Chilled Water & Cooling Towers (67242)', 'HVAC Duct Design (67243)'],
      5: ['VRF/VRV Air Conditioning (67251)', 'Cold Storage & Food Preservation (67252)', 'RAC Troubleshooting (67253)'],
      6: ['Energy Efficient HVAC Systems (67261)', 'Building Management System (BMS) (67262)', 'Industrial Management (65852)'],
      7: ['Industrial RAC Project & Load Calculation (67271)', 'Clean Room & Hospital HVAC (67272)'],
      8: ['Industrial Attachment (67281)']
    }
  },
  {
    id: 'tech_telecom',
    name: 'Telecommunication Technology',
    shortCode: 'TELECOM',
    aliases: ['Telecom', 'Telecommunication', 'TCT'],
    semestersCurriculum: {
      1: ['Basic Telecommunication (67311)', 'Basic Electronics (66811)', 'Mathematics-1 (65911)', 'English (65712)'],
      2: ['Transmission Lines & Waveguides (67321)', 'Electromagnetic Waves (67322)', 'Mathematics-2 (65921)'],
      3: ['Digital Telephony & Switching (67331)', 'Microwave Engineering (67332)', 'Signal Processing (67333)'],
      4: ['Cellular & Mobile Communication (67341)', 'Satellite Communication (67342)', 'Antenna & Propagation (67343)'],
      5: ['Optical Fiber Systems & DWDM (67351)', 'Broadband & LTE/5G Networks (67352)', 'Network Routing (67353)'],
      6: ['Telecom Regulation & Standards (67361)', 'VoIP & Unified Communication (67362)', 'Industrial Management (65852)'],
      7: ['Telecom Network Planning & Project (67371)', 'Next Generation Networks (NGN) (67372)'],
      8: ['Telecom Operator Internship (67381)']
    }
  },
  {
    id: 'tech_chemical',
    name: 'Chemical Technology',
    shortCode: 'CHEM',
    aliases: ['Chemical', 'Chemical Engineering'],
    semestersCurriculum: {
      1: ['Inorganic Chemistry (66311)', 'Chemical Process Calculations (66312)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Organic Chemistry (66321)', 'Unit Operations-1 (Fluid Mechanics) (66322)', 'Mathematics-2 (65921)'],
      3: ['Physical Chemistry (66331)', 'Unit Operations-2 (Heat Transfer) (66332)', 'Chemical Thermodynamics (66333)'],
      4: ['Mass Transfer Operations (66341)', 'Chemical Reaction Engineering (66342)', 'Process Control (66343)'],
      5: ['Fertilizer & Polymer Technology (66351)', 'Petroleum Refining & Gas Processing (66352)', 'Corrosion Science (66353)'],
      6: ['Industrial Safety & Hazard Control (66361)', 'Effluent Treatment (ETP) (66362)', 'Industrial Management (65852)'],
      7: ['Chemical Plant Design & Economics (66371)', 'Biochemical Technology (66372)'],
      8: ['Chemical Plant Internship (66381)']
    }
  },
  {
    id: 'tech_food',
    name: 'Food Technology',
    shortCode: 'FOOD',
    aliases: ['Food', 'Food Engineering'],
    semestersCurriculum: {
      1: ['Food Chemistry-1 (66911)', 'Food Microbiology-1 (66912)', 'Mathematics-1 (65911)', 'Chemistry (65913)'],
      2: ['Food Chemistry-2 (66921)', 'Food Preservation Principles (66922)', 'Food Engineering Drawing (66923)'],
      3: ['Fruit & Vegetable Processing (66931)', 'Cereal & Bakery Technology (66932)', 'Food Quality Assurance (66933)'],
      4: ['Dairy & Beverage Technology (66941)', 'Meat, Poultry & Fish Processing (66942)', 'Food Packaging Technology (66943)'],
      5: ['Food Analysis & Instrumentation (66951)', 'HACCP & Food Safety Standards (66952)', 'Fermentation Technology (66953)'],
      6: ['Food Plant Sanitation & Waste Disposal (66961)', 'Edible Oil & Fat Technology (66962)', 'Industrial Management (65852)'],
      7: ['Food Product Development Project (66971)', 'Food Laws & BSTI Regulations (66972)'],
      8: ['Food Processing Plant Internship (66981)']
    }
  },
  {
    id: 'tech_environmental',
    name: 'Environmental Technology',
    shortCode: 'ENV',
    aliases: ['Environmental', 'Environment Engineering'],
    semestersCurriculum: {
      1: ['Ecology & Environment (69011)', 'Environmental Chemistry (69012)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Water Supply Engineering (69021)', 'Environmental Microbiology (69022)', 'Mathematics-2 (65921)'],
      3: ['Wastewater Engineering & ETP (69031)', 'Air Pollution & Control (69032)', 'Environmental Hydrology (69033)'],
      4: ['Solid Waste Management (69041)', 'Hazardous Waste & Noise Control (69042)', 'GIS in Environmental Science (69043)'],
      5: ['Environmental Impact Assessment (EIA) (69051)', 'Climate Change & Disaster Mitigation (69052)', 'Renewable Resources (69053)'],
      6: ['Industrial Ecology & Cleaner Production (69061)', 'Environmental Law & Policy (69062)', 'Industrial Management (65852)'],
      7: ['Environmental Monitoring & Project (69071)', 'Remote Sensing & Modeling (69072)'],
      8: ['Environmental Field Attachment (69081)']
    }
  },
  {
    id: 'tech_electromedical',
    name: 'Electro-Medical Technology',
    shortCode: 'EMT',
    aliases: ['Electro-Medical', 'Electromedical', 'Electromedical Technology', 'Biomedical Engineering'],
    semestersCurriculum: {
      1: ['Human Anatomy & Physiology-1 (68611)', 'Basic Electricity & Electronics (68612)', 'Mathematics-1 (65911)'],
      2: ['Human Anatomy & Physiology-2 (68621)', 'Electronic Circuits in Healthcare (68622)', 'Mathematics-2 (65921)'],
      3: ['Bioelectric Potential & Electrodes (68631)', 'Diagnostic Medical Equipment (ECG/EEG) (68632)', 'Sensors & Transducers (68633)'],
      4: ['Therapeutic Medical Equipment (Defibrillator, Diathermy) (68641)', 'Medical Imaging-1 (X-Ray, Ultrasound) (68642)'],
      5: ['Medical Imaging-2 (CT, MRI) (68651)', 'Clinical Laboratory Instruments (68652)', 'Hospital Safety & Radiation (68653)'],
      6: ['Biomedical Signal Processing (68661)', 'ICU & OT Equipment Maintenance (68662)', 'Industrial Management (65852)'],
      7: ['Hospital Equipment Management & Project (68671)', 'Telemedicine & Biomechanics (68672)'],
      8: ['Hospital Internship & Biomedical Training (68681)']
    }
  },
  {
    id: 'tech_mechatronics',
    name: 'Mechatronics Technology',
    shortCode: 'MCT',
    aliases: ['Mechatronics', 'Robotics & Mechatronics'],
    semestersCurriculum: {
      1: ['Mechatronics Workshop (68711)', 'Engineering Mechanics (68712)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Actuators & Drive Systems (68721)', 'Electronic Devices & Circuits (68722)', 'Mathematics-2 (65921)'],
      3: ['Sensors & Instrumentation (68731)', 'Pneumatics & Hydraulics in Automation (68732)', 'C Programming (68733)'],
      4: ['Microcontroller & PLC Programming (68741)', 'Mechanism & Machine Design (68742)', 'Control Systems (68743)'],
      5: ['Industrial Robotics (68751)', 'SCADA & Industrial IoT (68752)', 'CNC Machines & CAM (68753)'],
      6: ['Automated Manufacturing Systems (68761)', 'Machine Vision Basics (68762)', 'Industrial Management (65852)'],
      7: ['Mechatronics Capstone Project (68771)', 'Embedded Linux & ROS (68772)'],
      8: ['Industrial Automation Internship (68781)']
    }
  },
  {
    id: 'tech_dtnt',
    name: 'Data Telecommunication and Networking Technology',
    shortCode: 'DTNT',
    aliases: ['Data Telecommunication', 'Networking Technology', 'DTNT', 'Data Telecom & Networking'],
    semestersCurriculum: {
      1: ['Data Telecommunication Fundamentals (68411)', 'Computer Application (66611)', 'Mathematics-1 (65911)', 'Physics-1 (65912)', 'English (65712)'],
      2: ['Digital Electronics (66822)', 'Data Communication Basics (68421)', 'Programming in C (66621)', 'Mathematics-2 (65921)'],
      3: ['Computer Networking-1 (LAN/WAN) (68431)', 'Optical Fiber Communication (68432)', 'Operating Systems (66651)', 'Mathematics-3 (65931)'],
      4: ['Routing & Switching Protocols (68441)', 'Wireless & Cellular Networks (68442)', 'Database Systems (66641)'],
      5: ['Network Security & Firewalls (68451)', 'Server & Cloud Administration (68452)', 'VoIP & IP Telephony (68453)'],
      6: ['Cyber Security & Ethical Hacking (68461)', 'Enterprise Network Design (68462)', 'Industrial Management (65852)'],
      7: ['Data Center Infrastructure & Project (68471)', 'IoT & Software Defined Networking (SDN) (68472)'],
      8: ['ISP & Telecom Industrial Attachment (68481)']
    }
  },
  {
    id: 'tech_instrumentation',
    name: 'Instrumentation and Process Control Technology',
    shortCode: 'IPCT',
    aliases: ['Instrumentation', 'Process Control', 'Instrumentation Engineering', 'IPCT'],
    semestersCurriculum: {
      1: ['Basic Instrumentation (69211)', 'Basic Electrical & Electronics (69212)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Measurement of Temperature & Pressure (69221)', 'Electronic Circuits (69222)', 'Mathematics-2 (65921)'],
      3: ['Measurement of Flow & Level (69231)', 'Pneumatic & Hydraulic Controls (69232)', 'Industrial Electronics (69233)'],
      4: ['Process Dynamics & Control Loops (69241)', 'Control Valves & Actuators (69242)', 'Microcontrollers in Process (69243)'],
      5: ['PLC, DCS & SCADA Systems (69251)', 'Analytical Instrumentation in Gas/Chemical Plants (69252)', 'Safety Instrumented Systems (SIS) (69253)'],
      6: ['Industrial Networking (Fieldbus/Profibus/Modbus) (69261)', 'Calibration & Maintenance (69262)', 'Industrial Management (65852)'],
      7: ['Process Plant Automation Project (69271)', 'Advanced Process Control & Optimization (69272)'],
      8: ['Process Industry Industrial Attachment (69281)']
    }
  },
  {
    id: 'tech_mining',
    name: 'Mining and Mine Survey Technology',
    shortCode: 'MINING',
    aliases: ['Mining', 'Mine Survey', 'Mining Engineering'],
    semestersCurriculum: {
      1: ['Intro to Mining Engineering (68811)', 'General Geology (68812)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Mine Surveying-1 (68821)', 'Mineralogy & Petrology (68822)', 'Mathematics-2 (65921)'],
      3: ['Underground Mining Methods (68831)', 'Surface & Open Cast Mining (68832)', 'Drilling & Blasting (68833)'],
      4: ['Mine Surveying-2 (68841)', 'Mine Ventilation & Environmental Safety (68842)', 'Rock Mechanics (68843)'],
      5: ['Mineral Dressing & Processing (68851)', 'Mine Machinery & Haulage (68852)', 'GIS in Mine Planning (68853)'],
      6: ['Mine Legislation & Safety Rules (68861)', 'Coal & Hard Rock Mining in BD (68862)', 'Industrial Management (65852)'],
      7: ['Mine Planning, Design & Project (68871)', 'Mine Environmental Reclamation (68872)'],
      8: ['Mine Site Industrial Internship (Barapukuria/Maddhapara) (68881)']
    }
  },
  {
    id: 'tech_construction',
    name: 'Construction Technology',
    shortCode: 'CONST',
    aliases: ['Construction', 'Construction Engineering', 'Building Construction Technology'],
    semestersCurriculum: {
      1: ['Construction Materials (68511)', 'Engineering Drawing (61011)', 'Mathematics-1 (65911)', 'Physics-1 (65912)'],
      2: ['Building Construction Process-1 (68521)', 'Construction Surveying-1 (68522)', 'Mathematics-2 (65921)', 'Chemistry (65913)'],
      3: ['Building Construction Process-2 (68531)', 'Concrete Technology (68532)', 'Structural Mechanics (66441)', 'Mathematics-3 (65931)'],
      4: ['Construction Estimating & Costing-1 (68541)', 'Geotechnical & Foundation Engineering (68542)', 'CAD for Construction (68543)'],
      5: ['Reinforced Concrete Design (RCC) (68551)', 'Construction Equipment & Safety (68552)', 'Highway & Bridge Construction (68553)'],
      6: ['Construction Project Management (68561)', 'Construction Estimating & Costing-2 (68562)', 'Industrial Management (65852)'],
      7: ['Quality Control & Tendering in Construction (68571)', 'Comprehensive Construction Capstone Project (68572)'],
      8: ['Construction Site Industrial Internship (68581)']
    }
  }
];

// Official BTEB Common & Related Subject Code Catalog (2016 & 2022 Probidhan)
const COMMON_BTEB_SUBJECTS: Record<string, string> = {
  '61011': 'Engineering Drawing',
  '65711': 'Bangla',
  '65712': 'English',
  '65721': 'Bangla-II',
  '65722': 'Communicative English',
  '65811': 'Social Science',
  '65812': 'Physical Education & Life Skills Development',
  '65841': 'Business Organization & Communication',
  '65851': 'Accounting Theory & Practice',
  '65852': 'Industrial Management',
  '65911': 'Mathematics-1',
  '65912': 'Physics-1',
  '65913': 'Chemistry',
  '65921': 'Mathematics-2',
  '65922': 'Physics-2',
  '65931': 'Mathematics-3',
  '69054': 'Environmental Studies',
  '25711': 'Bangla-I (2022 Reg)',
  '25712': 'English-I (2022 Reg)',
  '25721': 'Bangla-II (2022 Reg)',
  '25722': 'English-II (2022 Reg)',
  '25811': 'Social Science (2022 Reg)',
  '25812': 'Physical Education & Life Skills (2022 Reg)',
  '25831': 'Business Communication (2022 Reg)',
  '25841': 'Accounting (2022 Reg)',
  '25851': 'Principles of Marketing (2022 Reg)',
  '25852': 'Industrial Management (2022 Reg)',
  '25911': 'Mathematics-I (2022 Reg)',
  '25912': 'Physics-I (2022 Reg)',
  '25913': 'Chemistry (2022 Reg)',
  '25921': 'Mathematics-II (2022 Reg)',
  '25922': 'Physics-II (2022 Reg)',
  '25931': 'Mathematics-III (2022 Reg)',
  '21011': 'Engineering Drawing (2022 Reg)',
  '26611': 'Computer Office Application (2022 Reg)',
  '26621': 'Python Programming (2022 Reg)',
  '26631': 'Data Structure & Algorithm (2022 Reg)',
  '26641': 'Java Programming (2022 Reg)',
  '26651': 'Web Design & Development-I (2022 Reg)',
  '26661': 'Web Design & Development-II (2022 Reg)',
  '26662': 'Computer Networking (2022 Reg)',
  '26663': 'Database Management System (2022 Reg)',
  '26664': 'Microprocessor & Interfacing (2022 Reg)'
};

export interface ResolvedBtebSubject {
  code: string;
  name: string | null;
  technologyName?: string;
  semester?: number;
  nameSource: 'curriculum-mapped' | 'unmapped';
}

// Build a fast lookup map from TECHNOLOGIES_DIRECTORY + COMMON_BTEB_SUBJECTS
const subjectLookupMap: Map<string, { name: string; technologyName?: string; semester?: number }> = new Map();

for (const [code, name] of Object.entries(COMMON_BTEB_SUBJECTS)) {
  subjectLookupMap.set(code, { name });
}

for (const tech of TECHNOLOGIES_DIRECTORY) {
  if (tech.semestersCurriculum) {
    for (const [semStr, subjects] of Object.entries(tech.semestersCurriculum)) {
      const semNum = Number(semStr);
      for (const entry of subjects) {
        // Parse pattern: "Subject Name (66661)"
        const match = entry.match(/^(.*?)\s*\((\d{4,6})\)\s*$/);
        if (match) {
          const subjName = match[1].trim();
          const subjCode = match[2].trim();
          if (!subjectLookupMap.has(subjCode)) {
            subjectLookupMap.set(subjCode, {
              name: subjName,
              technologyName: tech.name,
              semester: semNum
            });
          }
        }
      }
    }
  }
}

for (const dept of UPLOADED_DEPARTMENT_DATASETS) {
  for (const semObj of dept.semesters || []) {
    const semMatch = String(semObj.semester || '').match(/(\d+)/);
    const semNum = semMatch ? Number(semMatch[1]) : undefined;
    for (const subj of semObj.subjects || []) {
      const code = String(subj.code || '').trim();
      const name = String(subj.name || '').trim();
      if (code && name && !subjectLookupMap.has(code)) {
        subjectLookupMap.set(code, {
          name,
          technologyName: dept.department_name,
          semester: semNum
        });
      }
    }
  }
}

/**
 * Resolves a 5-digit BTEB subject code against the official curriculum catalog.
 * Never invents a fake subject name when a code is unknown; returns name: null and nameSource: 'unmapped'.
 */
export function resolveBtebSubjectCode(rawCode: string): ResolvedBtebSubject {
  const cleanCode = String(rawCode || '').trim().replace(/\D/g, '');
  if (!cleanCode) {
    return { code: rawCode, name: null, nameSource: 'unmapped' };
  }
  const found = subjectLookupMap.get(cleanCode);
  if (found) {
    return {
      code: cleanCode,
      name: found.name,
      technologyName: found.technologyName,
      semester: found.semester,
      nameSource: 'curriculum-mapped'
    };
  }
  // Check 2022 <-> 2016 prefix equivalence (e.g. 26662 vs 66662) ONLY if exact 4-digit suffix matches a known technology subject
  if (cleanCode.length === 5 && cleanCode.startsWith('2')) {
    const legacyEquivalent = '6' + cleanCode.slice(1);
    const eqFound = subjectLookupMap.get(legacyEquivalent);
    if (eqFound) {
      return {
        code: cleanCode,
        name: `${eqFound.name} (2022 Reg)`,
        technologyName: eqFound.technologyName,
        semester: eqFound.semester,
        nameSource: 'curriculum-mapped'
      };
    }
  }
  return {
    code: cleanCode,
    name: null,
    nameSource: 'unmapped'
  };
}

// Known BTEB EIIN / Institute Codes for Polytechnic Institutes
const BTEB_INSTITUTE_CODE_MAP: Record<string, string> = {
  '50118': 'clg_dhaka',
  '50119': 'clg_dhaka_mohila',
  '70048': 'clg_chattogram',
  '70049': 'clg_chattogram_mohila',
  '73015': 'clg_bspi_kaptai',
  '20045': 'clg_rajshahi',
  '20046': 'clg_rajshahi_mohila',
  '35048': 'clg_barguna',
  '35049': 'clg_khulna_mohila',
  '42014': 'clg_barishal',
  '60019': 'clg_sylhet',
  '16058': 'clg_rangpur',
  '57016': 'clg_mymensingh',
  '22051': 'clg_bogura',
  '25042': 'clg_pabna',
  '33052': 'clg_jashore',
  '65054': 'clg_comilla',
  '13061': 'clg_dinajpur',
  '54021': 'clg_faridpur',
  '68018': 'clg_feni',
  '30025': 'clg_kushtia',
  '55031': 'clg_tangail',
  '44019': 'clg_patuakhali'
};

export function resolveBtebInstitute(instituteCode?: string, instituteNameHint?: string): CollegeItem | null {
  if (instituteNameHint && instituteNameHint.trim().length > 2) {
    const query = instituteNameHint.trim().toLowerCase();
    const match = COLLEGES_DIRECTORY.find(c =>
      c.name.toLowerCase().includes(query) ||
      query.includes(c.name.toLowerCase()) ||
      c.aliases.some(a => query.includes(a.toLowerCase())) ||
      query.includes(c.district.toLowerCase() + ' polytechnic')
    );
    if (match) return match;
  }
  if (instituteCode) {
    const cleanCode = String(instituteCode).trim();
    const mappedId = BTEB_INSTITUTE_CODE_MAP[cleanCode];
    if (mappedId) {
      const col = COLLEGES_DIRECTORY.find(c => c.id === mappedId);
      if (col) return col;
    }
  }
  return null;
}

// Helper: Normalize college name/id to canonical CollegeItem
export function normalizeCollege(input: string | undefined): CollegeItem {
  if (!input) return COLLEGES_DIRECTORY[0];
  const query = input.trim().toLowerCase();

  // 1. Direct ID match
  const byId = COLLEGES_DIRECTORY.find(c => c.id.toLowerCase() === query);
  if (byId) return byId;

  // 2. Canonical Name match
  const byName = COLLEGES_DIRECTORY.find(c => c.name.toLowerCase() === query);
  if (byName) return byName;

  // 3. Aliases match
  const byAlias = COLLEGES_DIRECTORY.find(c => 
    c.aliases.some(a => a.toLowerCase() === query || query.includes(a.toLowerCase()))
  );
  if (byAlias) return byAlias;

  // 4. District / Partial match
  const byPartial = COLLEGES_DIRECTORY.find(c => 
    c.name.toLowerCase().includes(query) || 
    (c.shortName && c.shortName.toLowerCase() === query)
  );
  if (byPartial) return byPartial;

  return COLLEGES_DIRECTORY[0];
}

// Helper: Normalize technology/department to canonical TechnologyItem
export function normalizeTechnology(input: string | undefined): TechnologyItem {
  if (!input) return TECHNOLOGIES_DIRECTORY[3]; // Default to CST
  const query = input.trim().toLowerCase();

  // 1. Direct ID match
  const byId = TECHNOLOGIES_DIRECTORY.find(t => t.id.toLowerCase() === query);
  if (byId) return byId;

  // 2. Canonical Name match
  const byName = TECHNOLOGIES_DIRECTORY.find(t => t.name.toLowerCase() === query);
  if (byName) return byName;

  // 3. Shortcode match
  const byCode = TECHNOLOGIES_DIRECTORY.find(t => t.shortCode.toLowerCase() === query);
  if (byCode) return byCode;

  // 4. Aliases match
  const byAlias = TECHNOLOGIES_DIRECTORY.find(t => 
    t.aliases.some(a => a.toLowerCase() === query || query.includes(a.toLowerCase()))
  );
  if (byAlias) return byAlias;

  // 5. Keyword match (e.g. 'computer', 'civil', 'power', etc.)
  const byKeyword = TECHNOLOGIES_DIRECTORY.find(t => 
    t.name.toLowerCase().includes(query) || query.includes(t.shortCode.toLowerCase())
  );
  if (byKeyword) return byKeyword;

  return TECHNOLOGIES_DIRECTORY[3]; // Default CST
}

// Get curriculum subjects for a given department and semester (never invent missing subjects)
export function getCurriculumSubjects(deptNameOrId: string, semester: number): string[] {
  const tech = normalizeTechnology(deptNameOrId);
  if (tech.semestersCurriculum && tech.semestersCurriculum[semester]) {
    return tech.semestersCurriculum[semester];
  }
  return [];
}

/**
 * STRICT NON-GUESSING COLLEGE RESOLVER
 * Returns the canonical CollegeItem ONLY if `input` explicitly matches a known
 * college ID, canonical name, shortName, or alias. Returns `null` if missing or unknown.
 * Never falls back to COLLEGES_DIRECTORY[0].
 */
export function resolveStrictCollege(input: string | null | undefined): CollegeItem | null {
  if (!input || typeof input !== 'string') return null;
  const query = input.trim().toLowerCase();
  if (!query) return null;

  // Legacy seed ID compatibility ('col_01_dhaka' -> 'clg_dhaka')
  if (query === 'col_01_dhaka') {
    return COLLEGES_DIRECTORY.find(c => c.id === 'clg_dhaka') || null;
  }

  const byId = COLLEGES_DIRECTORY.find(c => c.id.toLowerCase() === query);
  if (byId) return byId;

  const byName = COLLEGES_DIRECTORY.find(c => c.name.toLowerCase() === query);
  if (byName) return byName;

  const byShort = COLLEGES_DIRECTORY.find(c => c.shortName && c.shortName.toLowerCase() === query);
  if (byShort) return byShort;

  const byAlias = COLLEGES_DIRECTORY.find(c =>
    c.aliases.some(a => a.toLowerCase() === query || query.includes(a.toLowerCase()))
  );
  if (byAlias) return byAlias;

  const byPartial = COLLEGES_DIRECTORY.find(c =>
    c.name.toLowerCase().includes(query) || query.includes(c.name.toLowerCase())
  );
  if (byPartial) return byPartial;

  return null;
}

/**
 * STRICT NON-GUESSING TECHNOLOGY / DEPARTMENT RESOLVER
 * Returns the canonical TechnologyItem ONLY if `input` explicitly matches a known
 * technology ID, canonical name, shortCode, or alias. Returns `null` if missing or unknown.
 * Never falls back to TECHNOLOGIES_DIRECTORY[3] (CST).
 */
export function resolveStrictTechnology(input: string | null | undefined): TechnologyItem | null {
  if (!input || typeof input !== 'string') return null;
  const query = input.trim().toLowerCase();
  if (!query) return null;

  // Legacy seed ID compatibility ('tech_03_computer' / 'tech_computer' -> 'tech_cst')
  if (query === 'tech_03_computer' || query === 'tech_computer') {
    return TECHNOLOGIES_DIRECTORY.find(t => t.id === 'tech_cst') || null;
  }

  const byId = TECHNOLOGIES_DIRECTORY.find(t => t.id.toLowerCase() === query);
  if (byId) return byId;

  const byName = TECHNOLOGIES_DIRECTORY.find(t => t.name.toLowerCase() === query);
  if (byName) return byName;

  const byCode = TECHNOLOGIES_DIRECTORY.find(t => t.shortCode.toLowerCase() === query);
  if (byCode) return byCode;

  const byAlias = TECHNOLOGIES_DIRECTORY.find(t =>
    t.aliases.some(a => a.toLowerCase() === query || query.includes(a.toLowerCase()))
  );
  if (byAlias) return byAlias;

  const byKeyword = TECHNOLOGIES_DIRECTORY.find(t =>
    t.name.toLowerCase().includes(query) || query.includes(t.name.toLowerCase())
  );
  if (byKeyword) return byKeyword;

  return null;
}


