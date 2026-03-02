/**
 * Database Seed Data
 * 
 * Provides functions to seed initial data into the database,
 * including scheme categories and default user groups.
 */

import { Neo4jConnection } from './neo4j.config';

/**
 * Seed scheme categories
 */
export async function seedCategories(connection: Neo4jConnection): Promise<void> {
  console.log('  Seeding scheme categories...');

  const categories = [
    {
      categoryId: 'education',
      categoryName: 'Education',
      description: 'Scholarships, student loans, and educational support schemes',
      iconUrl: '/icons/education.svg',
    },
    {
      categoryId: 'healthcare',
      categoryName: 'Healthcare',
      description: 'Health insurance, medical assistance, and wellness programs',
      iconUrl: '/icons/healthcare.svg',
    },
    {
      categoryId: 'agriculture',
      categoryName: 'Agriculture',
      description: 'Farmer support, crop insurance, and agricultural subsidies',
      iconUrl: '/icons/agriculture.svg',
    },
    {
      categoryId: 'employment',
      categoryName: 'Employment',
      description: 'Job training, skill development, and employment schemes',
      iconUrl: '/icons/employment.svg',
    },
    {
      categoryId: 'housing',
      categoryName: 'Housing',
      description: 'Affordable housing, home loans, and shelter programs',
      iconUrl: '/icons/housing.svg',
    },
    {
      categoryId: 'social_welfare',
      categoryName: 'Social Welfare',
      description: 'Pension schemes, disability support, and social security',
      iconUrl: '/icons/social-welfare.svg',
    },
    {
      categoryId: 'women_child',
      categoryName: 'Women & Child Development',
      description: 'Schemes for women empowerment and child welfare',
      iconUrl: '/icons/women-child.svg',
    },
    {
      categoryId: 'financial',
      categoryName: 'Financial Assistance',
      description: 'Loans, subsidies, and financial support programs',
      iconUrl: '/icons/financial.svg',
    },
  ];

  const query = `
    UNWIND $categories AS category
    MERGE (c:Category {categoryId: category.categoryId})
    SET c.categoryName = category.categoryName,
        c.description = category.description,
        c.iconUrl = category.iconUrl
    RETURN c.categoryId AS categoryId, c.categoryName AS categoryName
  `;

  try {
    const result = await connection.executeWrite<{ categoryId: string; categoryName: string }>(
      query,
      { categories }
    );

    console.log(`    ✓ Created/updated ${result.length} categories`);
    result.forEach((cat) => {
      console.log(`      - ${cat.categoryName} (${cat.categoryId})`);
    });
  } catch (error) {
    console.error('    ✗ Failed to seed categories:', error);
    throw error;
  }
}

/**
 * Seed default user groups (demographic buckets)
 */
export async function seedUserGroups(connection: Neo4jConnection): Promise<void> {
  console.log('  Seeding default user groups...');

  const userGroups = [
    {
      groupId: 'farmers',
      groupName: 'Farmers',
      description: 'Agricultural workers and farmers',
      ageRangeMin: 18,
      ageRangeMax: 70,
      incomeRangeMin: 0,
      incomeRangeMax: 500000,
      commonOccupations: ['farmer', 'agricultural_worker'],
      commonLocations: ['rural'],
    },
    {
      groupId: 'students',
      groupName: 'Students',
      description: 'Students pursuing education',
      ageRangeMin: 18,
      ageRangeMax: 25,
      incomeRangeMin: 0,
      incomeRangeMax: 300000,
      commonOccupations: ['student'],
      commonLocations: ['urban', 'rural'],
    },
    {
      groupId: 'senior_citizens',
      groupName: 'Senior Citizens',
      description: 'Elderly citizens aged 60 and above',
      ageRangeMin: 60,
      ageRangeMax: 100,
      incomeRangeMin: 0,
      incomeRangeMax: 1000000,
      commonOccupations: ['retired', 'unemployed'],
      commonLocations: ['urban', 'rural'],
    },
    {
      groupId: 'low_income_workers',
      groupName: 'Low Income Workers',
      description: 'Workers with annual income below ₹2.5 lakhs',
      ageRangeMin: 18,
      ageRangeMax: 60,
      incomeRangeMin: 0,
      incomeRangeMax: 250000,
      commonOccupations: ['daily_wage', 'labor', 'service'],
      commonLocations: ['urban', 'rural'],
    },
    {
      groupId: 'women',
      groupName: 'Women',
      description: 'Women-focused schemes and programs',
      ageRangeMin: 18,
      ageRangeMax: 70,
      incomeRangeMin: 0,
      incomeRangeMax: 1000000,
      commonOccupations: ['all'],
      commonLocations: ['urban', 'rural'],
    },
    {
      groupId: 'msme_self_employed',
      groupName: 'MSME / Self-employed',
      description: 'Small business owners and self-employed individuals',
      ageRangeMin: 21,
      ageRangeMax: 65,
      incomeRangeMin: 100000,
      incomeRangeMax: 5000000,
      commonOccupations: ['self_employed', 'business_owner'],
      commonLocations: ['urban', 'semi_urban'],
    },
    {
      groupId: 'disabled',
      groupName: 'Persons with Disabilities',
      description: 'Schemes for persons with disabilities',
      ageRangeMin: 18,
      ageRangeMax: 70,
      incomeRangeMin: 0,
      incomeRangeMax: 1000000,
      commonOccupations: ['all'],
      commonLocations: ['urban', 'rural'],
    },
    {
      groupId: 'rural_household',
      groupName: 'Rural Household',
      description: 'Rural population schemes',
      ageRangeMin: 18,
      ageRangeMax: 70,
      incomeRangeMin: 0,
      incomeRangeMax: 500000,
      commonOccupations: ['farmer', 'agricultural_worker', 'labor'],
      commonLocations: ['rural'],
    },
    {
      groupId: 'urban_bpl',
      groupName: 'Urban Below Poverty Line',
      description: 'Urban population below poverty line',
      ageRangeMin: 18,
      ageRangeMax: 70,
      incomeRangeMin: 0,
      incomeRangeMax: 150000,
      commonOccupations: ['daily_wage', 'labor', 'unemployed'],
      commonLocations: ['urban'],
    },
  ];

  const query = `
    UNWIND $userGroups AS group
    MERGE (g:UserGroup {groupId: group.groupId})
    SET g.groupName = group.groupName,
        g.description = group.description,
        g.ageRangeMin = group.ageRangeMin,
        g.ageRangeMax = group.ageRangeMax,
        g.incomeRangeMin = group.incomeRangeMin,
        g.incomeRangeMax = group.incomeRangeMax,
        g.commonOccupations = group.commonOccupations,
        g.commonLocations = group.commonLocations,
        g.memberCount = 0,
        g.createdAt = datetime(),
        g.lastUpdated = datetime()
    RETURN g.groupId AS groupId, g.groupName AS groupName
  `;

  try {
    const result = await connection.executeWrite<{ groupId: string; groupName: string }>(
      query,
      { userGroups }
    );

    console.log(`    ✓ Created/updated ${result.length} user groups`);
    result.forEach((group) => {
      console.log(`      - ${group.groupName} (${group.groupId})`);
    });
  } catch (error) {
    console.error('    ✗ Failed to seed user groups:', error);
    throw error;
  }
}

/**
 * Clear all data from the database (use with caution!)
 */
export async function clearAllData(connection: Neo4jConnection): Promise<void> {
  console.log('⚠️  Clearing all data from database...');

  const query = `
    MATCH (n)
    DETACH DELETE n
  `;

  try {
    await connection.executeWrite(query);
    console.log('  ✓ All data cleared');
  } catch (error) {
    console.error('  ✗ Failed to clear data:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(connection: Neo4jConnection): Promise<void> {
  console.log('Database Statistics:');

  const queries = [
    { label: 'Users', query: 'MATCH (u:User) RETURN count(u) AS count' },
    { label: 'Schemes', query: 'MATCH (s:Scheme) RETURN count(s) AS count' },
    { label: 'User Groups', query: 'MATCH (g:UserGroup) RETURN count(g) AS count' },
    { label: 'Categories', query: 'MATCH (c:Category) RETURN count(c) AS count' },
    { label: 'Nudges', query: 'MATCH (n:Nudge) RETURN count(n) AS count' },
    { label: 'Relationships', query: 'MATCH ()-[r]->() RETURN count(r) AS count' },
  ];

  for (const { label, query } of queries) {
    try {
      const result = await connection.executeRead<{ count: number }>(query);
      const count = result[0]?.count || 0;
      console.log(`  - ${label}: ${count}`);
    } catch (error) {
      console.error(`  - ${label}: Error`);
    }
  }
}
