import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const entryReasons = [
  // SMT
  { category: 'SMT', name: 'Between Sessions' },
  { category: 'SMT', name: 'Between Days' },
  { category: 'SMT', name: 'Between Weeks' },
  { category: 'SMT', name: '90m Cycle' },
  { category: 'SMT', name: 'SMT Fill 1h' },
  { category: 'SMT', name: 'SMT Fill 15m' },
  { category: 'SMT', name: 'SMT Fill 5m' },
  { category: 'SMT', name: 'Double SMT' },
  // PSP
  { category: 'PSP', name: 'PSP 6h' },
  { category: 'PSP', name: 'PSP 4h' },
  { category: 'PSP', name: 'PSP Daily' },
  { category: 'PSP', name: 'PSP Weekly' },
  { category: 'PSP', name: 'PSP 1h' },
  { category: 'PSP', name: 'PSP 15m' },
  { category: 'PSP', name: 'PSP 5m' },
  // Price Action
  { category: 'Price Action', name: 'Above True Open' },
  { category: 'Price Action', name: 'Below True Open' },
  { category: 'Price Action', name: 'Liquidity Sweep' },
  { category: 'Price Action', name: 'Daily Bias Bull' },
  { category: 'Price Action', name: 'Daily Bias Bear' },
  // FVG/IFVG
  { category: 'FVG/IFVG', name: 'FVG 1h' },
  { category: 'FVG/IFVG', name: 'FVG 15m' },
  { category: 'FVG/IFVG', name: 'FVG 5m' },
  { category: 'FVG/IFVG', name: 'FVG 3m' },
  { category: 'FVG/IFVG', name: 'FVG 1m' },
  { category: 'FVG/IFVG', name: 'IFVG 1h' },
  { category: 'FVG/IFVG', name: 'IFVG 15m' },
  { category: 'FVG/IFVG', name: 'IFVG 5m' },
  { category: 'FVG/IFVG', name: 'IFVG 3m' },
  { category: 'FVG/IFVG', name: 'IFVG 1m' },
  // CISD
  { category: 'CISD', name: 'CISD 1h' },
  { category: 'CISD', name: 'CISD 15m' },
  { category: 'CISD', name: 'CISD 5m' },
  { category: 'CISD', name: 'CISD 3m' },
  { category: 'CISD', name: 'CISD 1m' },
]

async function main() {
  console.log('Seeding entry reasons...')
  for (const reason of entryReasons) {
    await prisma.entryReason.upsert({
      where: { name: reason.name },
      update: {},
      create: reason,
    })
  }
  console.log(`✓ Seeded ${entryReasons.length} entry reasons`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
