import { Database, Relation } from '@/types';

export const generateRelationLines = (databases: Database[]): Relation[] => {
  const relations: Relation[] = [];
  
  databases.forEach(database => {
    database.properties.forEach(property => {
      if (property.type === 'relation' && 
          property.relationConfig?.targetDatabaseId && 
          property.relationConfig?.isParent) {
        
        // Find the corresponding child property in the target database using linkedPropertyId
        const targetDatabase = databases.find(db => db.id === property.relationConfig!.targetDatabaseId);
        const childProperty = targetDatabase?.properties.find(prop => 
          prop.id === property.relationConfig?.linkedPropertyId
        );

        // Create a relation line for each parent property with its linked child property
        relations.push({
          id: `relation-${database.id}-${property.id}-${property.relationConfig.targetDatabaseId}-${childProperty?.id || 'unknown'}`,
          fromDatabaseId: database.id,
          toDatabaseId: property.relationConfig.targetDatabaseId,
          type: property.relationConfig.isDualProperty ? 'dual' : 'single',
          fromPropertyName: property.name,
          toPropertyName: childProperty?.name || 'Related',
          fromPropertyId: property.id,
          toPropertyId: childProperty?.id
        });
      }
      
      // Add formula dependency relations
      if (property.type === 'formula' && property.formulaConfig?.referencedProperties) {
        console.log(`Found formula property: ${property.name} in database: ${database.name}`);
        console.log(`Referenced properties: `, property.formulaConfig.referencedProperties);
        
        property.formulaConfig.referencedProperties.forEach(refProp => {
          if (refProp.includes('.')) {
            console.log(`Processing cross-database reference: ${refProp}`);
            // Cross-database reference (e.g., "RelationName.PropertyName")
            const [relationName, targetPropName] = refProp.split('.');
            const relationProp = database.properties.find(p => 
              p.name === relationName && p.type === 'relation'
            );
            
            console.log(`Found relation property: `, relationProp);
            
            if (relationProp?.relationConfig?.targetDatabaseId) {
              const targetDb = databases.find(db => db.id === relationProp.relationConfig?.targetDatabaseId);
              const targetProp = targetDb?.properties.find(p => p.name === targetPropName);
              
              console.log(`Target database: `, targetDb?.name);
              console.log(`Target property: `, targetProp);
              
              if (targetProp) {
                const formulaRelation = {
                  id: `formula-${database.id}-${property.id}-${targetDb.id}-${targetProp.id}`,
                  fromDatabaseId: database.id,
                  toDatabaseId: targetDb.id,
                  type: 'formula' as const,
                  fromPropertyName: property.name,
                  toPropertyName: targetProp.name,
                  fromPropertyId: property.id,
                  toPropertyId: targetProp.id
                };
                console.log(`Adding formula relation: `, formulaRelation);
                relations.push(formulaRelation);
              }
            }
          }
          // Same-database formula dependencies are handled in Canvas component
        });
      }
    });
  });

  console.log('Generated relations:', relations);
  console.log('Formula relations:', relations.filter(r => r.type === 'formula'));
  return relations;
};