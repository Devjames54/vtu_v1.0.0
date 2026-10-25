export interface Provider {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
}

export const serviceProviders: Record<string, Provider[]> = {
  airtime: [
    { id: "mtn", name: "MTN Nigeria", shortName: "MTN", color: "bg-[#FFCC00]", textColor: "text-black" },
    { id: "airtel", name: "Airtel Nigeria", shortName: "Airtel", color: "bg-[#FF0000]", textColor: "text-white" },
    { id: "glo", name: "Globacom", shortName: "Glo", color: "bg-[#009933]", textColor: "text-white" },
    { id: "9mobile", name: "9mobile", shortName: "9mobile", color: "bg-[#006600]", textColor: "text-white" },
  ],
  data: [
    { id: "mtn", name: "MTN Data", shortName: "MTN", color: "bg-[#FFCC00]", textColor: "text-black" },
    { id: "airtel", name: "Airtel Data", shortName: "Airtel", color: "bg-[#FF0000]", textColor: "text-white" },
    { id: "glo", name: "Glo Data", shortName: "Glo", color: "bg-[#009933]", textColor: "text-white" },
    { id: "9mobile", name: "9mobile Data", shortName: "9mobile", color: "bg-[#006600]", textColor: "text-white" },
    { id: "smile", name: "Smile Communications", shortName: "Smile", color: "bg-[#FFCC00]", textColor: "text-black" },
    { id: "spectranet", name: "Spectranet", shortName: "Spectranet", color: "bg-[#003399]", textColor: "text-white" },
  ],
  electricity: [
    { id: "ikedc", name: "Ikeja Electric", shortName: "IKEDC", color: "bg-[#FF0000]", textColor: "text-white" },
    { id: "ekedc", name: "Eko Electric", shortName: "EKEDC", color: "bg-[#003399]", textColor: "text-white" },
    { id: "aedc", name: "Abuja Electric", shortName: "AEDC", color: "bg-[#006600]", textColor: "text-white" },
    { id: "kedco", name: "Kano Electric", shortName: "KEDCO", color: "bg-[#009933]", textColor: "text-white" },
    { id: "phed", name: "Port Harcourt Electric", shortName: "PHED", color: "bg-[#003366]", textColor: "text-white" },
    { id: "ibedc", name: "Ibadan Electric", shortName: "IBEDC", color: "bg-[#FF6600]", textColor: "text-white" },
    { id: "eedc", name: "Enugu Electric", shortName: "EEDC", color: "bg-[#FF9900]", textColor: "text-black" },
    { id: "kaedco", name: "Kaduna Electric", shortName: "KAEDCO", color: "bg-[#009900]", textColor: "text-white" },
    { id: "jedc", name: "Jos Electric", shortName: "JEDC", color: "bg-[#336699]", textColor: "text-white" },
  ],
  cables: [
    { id: "dstv", name: "DSTV", shortName: "DSTV", color: "bg-[#0055A5]", textColor: "text-white" },
    { id: "gotv", name: "GOTV", shortName: "GOTV", color: "bg-[#FFCC00]", textColor: "text-black" },
    { id: "startimes", name: "Startimes", shortName: "Startimes", color: "bg-[#FF6600]", textColor: "text-white" },
    { id: "showmax", name: "Showmax", shortName: "Showmax", color: "bg-[#E50914]", textColor: "text-white" },
  ],
  exams: [
    { id: "waec", name: "WAEC Result Checker", shortName: "WAEC", color: "bg-[#003366]", textColor: "text-white" },
    { id: "neco", name: "NECO Result Token", shortName: "NECO", color: "bg-[#006600]", textColor: "text-white" },
    { id: "jamb", name: "JAMB PIN", shortName: "JAMB", color: "bg-[#009900]", textColor: "text-white" },
    { id: "nabteb", name: "NABTEB Result Checker", shortName: "NABTEB", color: "bg-[#003399]", textColor: "text-white" },
  ],
  betting: [
    { id: "bet9ja", name: "Bet9ja", shortName: "Bet9ja", color: "bg-[#006600]", textColor: "text-white" },
    { id: "sportybet", name: "SportyBet", shortName: "SportyBet", color: "bg-[#FF0000]", textColor: "text-white" },
    { id: "nairabet", name: "NairaBet", shortName: "NairaBet", color: "bg-[#003399]", textColor: "text-white" },
    { id: "betking", name: "BetKing", shortName: "BetKing", color: "bg-[#FFCC00]", textColor: "text-black" },
    { id: "1xbet", name: "1xBet", shortName: "1xBet", color: "bg-[#0055A5]", textColor: "text-white" },
  ]
};
