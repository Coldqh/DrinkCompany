import type { BeverageCategoryId } from './beverageCatalog';

export type ServeMethod = 'build' | 'stir' | 'shake' | 'blend' | 'roll' | 'layer' | 'throw';
export type CocktailIce = 'none' | 'cube' | 'large_cube' | 'crushed' | 'up';
export type CocktailIngredientUnit = 'ml' | 'g' | 'piece';

export interface CocktailIngredientSelector {
  productId?: string;
  categoryId?: BeverageCategoryId;
  pantryTag?: string;
}

export interface CocktailIngredientDefinition extends CocktailIngredientSelector {
  amount: number;
  unit: CocktailIngredientUnit;
  alternatives?: CocktailIngredientSelector[];
  optional?: boolean;
}

export interface CocktailRecipeDefinition {
  id: string;
  name: string;
  method: ServeMethod;
  glassware: string;
  ice: CocktailIce;
  garnish: string[];
  ingredients: CocktailIngredientDefinition[];
  preparationSeconds: number;
  complexity: 1 | 2 | 3 | 4 | 5;
  tags: string[];
}

export interface CocktailPantryDefinition {
  tag: string;
  name: string;
  unit: CocktailIngredientUnit;
  unitCost: number;
  shelfLifeDays: number;
  openingStock: number;
  reorderPoint: number;
  targetStock: number;
}

const category = (
  categoryId: BeverageCategoryId,
  amount: number,
  alternatives: CocktailIngredientSelector[] = [],
): CocktailIngredientDefinition => ({ categoryId, amount, unit: 'ml', alternatives });

const pantry = (pantryTag: string, amount: number, unit: CocktailIngredientUnit = 'ml'): CocktailIngredientDefinition => ({
  pantryTag,
  amount,
  unit,
});

export const cocktailPantryCatalog: CocktailPantryDefinition[] = [
  { tag: 'sugar_syrup', name: 'Сахарный сироп', unit: 'ml', unitCost: .004, shelfLifeDays: 21, openingStock: 4_000, reorderPoint: 700, targetStock: 4_000 },
  { tag: 'honey_syrup', name: 'Медовый сироп', unit: 'ml', unitCost: .009, shelfLifeDays: 18, openingStock: 1_500, reorderPoint: 300, targetStock: 1_500 },
  { tag: 'orgeat', name: 'Орже', unit: 'ml', unitCost: .012, shelfLifeDays: 30, openingStock: 1_200, reorderPoint: 250, targetStock: 1_200 },
  { tag: 'grenadine', name: 'Гренадин', unit: 'ml', unitCost: .008, shelfLifeDays: 45, openingStock: 1_500, reorderPoint: 300, targetStock: 1_500 },
  { tag: 'lime_juice', name: 'Сок лайма', unit: 'ml', unitCost: .013, shelfLifeDays: 4, openingStock: 3_000, reorderPoint: 700, targetStock: 3_000 },
  { tag: 'lemon_juice', name: 'Лимонный сок', unit: 'ml', unitCost: .01, shelfLifeDays: 4, openingStock: 3_000, reorderPoint: 700, targetStock: 3_000 },
  { tag: 'orange_juice', name: 'Апельсиновый сок', unit: 'ml', unitCost: .005, shelfLifeDays: 5, openingStock: 4_000, reorderPoint: 900, targetStock: 4_000 },
  { tag: 'pineapple_juice', name: 'Ананасовый сок', unit: 'ml', unitCost: .007, shelfLifeDays: 6, openingStock: 3_000, reorderPoint: 700, targetStock: 3_000 },
  { tag: 'cranberry_juice', name: 'Клюквенный морс', unit: 'ml', unitCost: .006, shelfLifeDays: 7, openingStock: 3_000, reorderPoint: 700, targetStock: 3_000 },
  { tag: 'tomato_juice', name: 'Томатный сок', unit: 'ml', unitCost: .005, shelfLifeDays: 7, openingStock: 2_500, reorderPoint: 600, targetStock: 2_500 },
  { tag: 'passion_fruit', name: 'Пюре маракуйи', unit: 'ml', unitCost: .018, shelfLifeDays: 10, openingStock: 1_200, reorderPoint: 250, targetStock: 1_200 },
  { tag: 'coconut_cream', name: 'Кокосовые сливки', unit: 'ml', unitCost: .012, shelfLifeDays: 8, openingStock: 1_500, reorderPoint: 350, targetStock: 1_500 },
  { tag: 'cream', name: 'Сливки', unit: 'ml', unitCost: .008, shelfLifeDays: 5, openingStock: 1_200, reorderPoint: 300, targetStock: 1_200 },
  { tag: 'coffee', name: 'Эспрессо', unit: 'ml', unitCost: .011, shelfLifeDays: 1, openingStock: 1_800, reorderPoint: 450, targetStock: 1_800 },
  { tag: 'egg_white', name: 'Яичный белок', unit: 'ml', unitCost: .009, shelfLifeDays: 3, openingStock: 1_000, reorderPoint: 250, targetStock: 1_000 },
  { tag: 'soda', name: 'Содовая', unit: 'ml', unitCost: .002, shelfLifeDays: 5, openingStock: 8_000, reorderPoint: 1_500, targetStock: 8_000 },
  { tag: 'tonic', name: 'Тоник', unit: 'ml', unitCost: .004, shelfLifeDays: 5, openingStock: 7_000, reorderPoint: 1_400, targetStock: 7_000 },
  { tag: 'cola', name: 'Кола', unit: 'ml', unitCost: .0035, shelfLifeDays: 5, openingStock: 7_000, reorderPoint: 1_400, targetStock: 7_000 },
  { tag: 'ginger_beer', name: 'Имбирное пиво', unit: 'ml', unitCost: .006, shelfLifeDays: 6, openingStock: 5_000, reorderPoint: 1_000, targetStock: 5_000 },
  { tag: 'ginger_ale', name: 'Имбирный эль', unit: 'ml', unitCost: .005, shelfLifeDays: 6, openingStock: 3_500, reorderPoint: 700, targetStock: 3_500 },
  { tag: 'mint', name: 'Мята', unit: 'piece', unitCost: .04, shelfLifeDays: 4, openingStock: 240, reorderPoint: 50, targetStock: 240 },
  { tag: 'lime_wedge', name: 'Долька лайма', unit: 'piece', unitCost: .12, shelfLifeDays: 4, openingStock: 100, reorderPoint: 20, targetStock: 100 },
  { tag: 'lemon_wedge', name: 'Долька лимона', unit: 'piece', unitCost: .09, shelfLifeDays: 4, openingStock: 100, reorderPoint: 20, targetStock: 100 },
  { tag: 'orange_slice', name: 'Долька апельсина', unit: 'piece', unitCost: .1, shelfLifeDays: 4, openingStock: 80, reorderPoint: 16, targetStock: 80 },
  { tag: 'orange_peel', name: 'Цедра апельсина', unit: 'piece', unitCost: .08, shelfLifeDays: 4, openingStock: 100, reorderPoint: 20, targetStock: 100 },
  { tag: 'lemon_twist', name: 'Лимонный твист', unit: 'piece', unitCost: .08, shelfLifeDays: 4, openingStock: 100, reorderPoint: 20, targetStock: 100 },
  { tag: 'olive', name: 'Оливка', unit: 'piece', unitCost: .06, shelfLifeDays: 30, openingStock: 140, reorderPoint: 30, targetStock: 140 },
  { tag: 'cocktail_cherry', name: 'Коктейльная вишня', unit: 'piece', unitCost: .13, shelfLifeDays: 90, openingStock: 100, reorderPoint: 20, targetStock: 100 },
  { tag: 'cucumber', name: 'Ломтик огурца', unit: 'piece', unitCost: .05, shelfLifeDays: 4, openingStock: 100, reorderPoint: 20, targetStock: 100 },
  { tag: 'celery', name: 'Стебель сельдерея', unit: 'piece', unitCost: .18, shelfLifeDays: 5, openingStock: 50, reorderPoint: 10, targetStock: 50 },
  { tag: 'salt', name: 'Соль', unit: 'g', unitCost: .001, shelfLifeDays: 720, openingStock: 1_000, reorderPoint: 200, targetStock: 1_000 },
  { tag: 'spice_mix', name: 'Пряная смесь', unit: 'g', unitCost: .018, shelfLifeDays: 180, openingStock: 250, reorderPoint: 50, targetStock: 250 },
];

export const cocktailRecipes: CocktailRecipeDefinition[] = [
  { id: 'old-fashioned', name: 'Old Fashioned', method: 'stir', glassware: 'rocks', ice: 'large_cube', garnish: ['orange peel'], preparationSeconds: 75, complexity: 2, tags: ['classic', 'spirit-forward', 'whisky'], ingredients: [category('whisky', 60), category('amaro_bitter', 2, [{ pantryTag: 'spice_mix' }]), pantry('sugar_syrup', 8), pantry('orange_peel', 1, 'piece')] },
  { id: 'whiskey-sour', name: 'Whiskey Sour', method: 'shake', glassware: 'rocks', ice: 'cube', garnish: ['lemon twist'], preparationSeconds: 105, complexity: 3, tags: ['classic', 'sour', 'whisky'], ingredients: [category('whisky', 60), pantry('lemon_juice', 30), pantry('sugar_syrup', 20), pantry('egg_white', 20), pantry('lemon_twist', 1, 'piece')] },
  { id: 'manhattan', name: 'Manhattan', method: 'stir', glassware: 'coupe', ice: 'up', garnish: ['cocktail cherry'], preparationSeconds: 85, complexity: 3, tags: ['classic', 'spirit-forward', 'whisky'], ingredients: [category('whisky', 50), category('vermouth_aperitif', 20, [{ categoryId: 'fortified_wine' }]), category('amaro_bitter', 2, [{ pantryTag: 'spice_mix' }]), pantry('cocktail_cherry', 1, 'piece')] },
  { id: 'mint-julep', name: 'Mint Julep', method: 'build', glassware: 'julep', ice: 'crushed', garnish: ['mint'], preparationSeconds: 95, complexity: 3, tags: ['classic', 'refreshing', 'whisky'], ingredients: [category('whisky', 60), pantry('sugar_syrup', 12), pantry('mint', 10, 'piece')] },
  { id: 'boulevardier', name: 'Boulevardier', method: 'stir', glassware: 'rocks', ice: 'large_cube', garnish: ['orange peel'], preparationSeconds: 80, complexity: 3, tags: ['classic', 'bitter', 'whisky'], ingredients: [category('whisky', 45), category('vermouth_aperitif', 30), category('amaro_bitter', 30), pantry('orange_peel', 1, 'piece')] },
  { id: 'sazerac', name: 'Sazerac', method: 'stir', glassware: 'rocks', ice: 'none', garnish: ['lemon twist'], preparationSeconds: 105, complexity: 4, tags: ['classic', 'spirit-forward', 'whisky'], ingredients: [category('whisky', 60, [{ categoryId: 'brandy' }]), category('amaro_bitter', 3), category('liqueur', 5), pantry('sugar_syrup', 7), pantry('lemon_twist', 1, 'piece')] },
  { id: 'irish-coffee', name: 'Irish Coffee', method: 'build', glassware: 'irish_coffee', ice: 'none', garnish: [], preparationSeconds: 90, complexity: 3, tags: ['hot', 'coffee', 'whisky'], ingredients: [category('whisky', 45), pantry('coffee', 90), pantry('sugar_syrup', 12), pantry('cream', 30)] },
  { id: 'highball', name: 'Highball', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['lemon twist'], preparationSeconds: 45, complexity: 1, tags: ['classic', 'long', 'whisky'], ingredients: [category('whisky', 45), category('mixer', 120, [{ pantryTag: 'soda' }]), pantry('lemon_twist', 1, 'piece')] },

  { id: 'negroni', name: 'Negroni', method: 'stir', glassware: 'rocks', ice: 'large_cube', garnish: ['orange peel'], preparationSeconds: 75, complexity: 2, tags: ['classic', 'bitter', 'gin'], ingredients: [category('gin', 30), category('vermouth_aperitif', 30), category('amaro_bitter', 30), pantry('orange_peel', 1, 'piece')] },
  { id: 'dry-martini', name: 'Dry Martini', method: 'stir', glassware: 'martini', ice: 'up', garnish: ['olive'], preparationSeconds: 85, complexity: 3, tags: ['classic', 'dry', 'gin'], ingredients: [category('gin', 60, [{ categoryId: 'vodka' }]), category('vermouth_aperitif', 10), pantry('olive', 1, 'piece')] },
  { id: 'gin-tonic', name: 'Gin & Tonic', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['lime wedge'], preparationSeconds: 40, complexity: 1, tags: ['long', 'refreshing', 'gin'], ingredients: [category('gin', 50), pantry('tonic', 120), pantry('lime_wedge', 1, 'piece')] },
  { id: 'tom-collins', name: 'Tom Collins', method: 'build', glassware: 'collins', ice: 'cube', garnish: ['lemon wedge'], preparationSeconds: 70, complexity: 2, tags: ['classic', 'long', 'gin'], ingredients: [category('gin', 50), pantry('lemon_juice', 25), pantry('sugar_syrup', 15), pantry('soda', 80), pantry('lemon_wedge', 1, 'piece')] },
  { id: 'gimlet', name: 'Gimlet', method: 'shake', glassware: 'coupe', ice: 'up', garnish: ['lime wedge'], preparationSeconds: 70, complexity: 2, tags: ['classic', 'sour', 'gin'], ingredients: [category('gin', 60), pantry('lime_juice', 25), pantry('sugar_syrup', 15), pantry('lime_wedge', 1, 'piece')] },
  { id: 'aviation', name: 'Aviation', method: 'shake', glassware: 'coupe', ice: 'up', garnish: ['cocktail cherry'], preparationSeconds: 95, complexity: 4, tags: ['classic', 'floral', 'gin'], ingredients: [category('gin', 45), category('liqueur', 22), pantry('lemon_juice', 15), pantry('cocktail_cherry', 1, 'piece')] },
  { id: 'french-75', name: 'French 75', method: 'shake', glassware: 'flute', ice: 'up', garnish: ['lemon twist'], preparationSeconds: 90, complexity: 3, tags: ['classic', 'sparkling', 'gin'], ingredients: [category('gin', 30), category('sparkling_wine', 60), pantry('lemon_juice', 15), pantry('sugar_syrup', 10), pantry('lemon_twist', 1, 'piece')] },
  { id: 'clover-club', name: 'Clover Club', method: 'shake', glassware: 'coupe', ice: 'up', garnish: [], preparationSeconds: 115, complexity: 4, tags: ['classic', 'sour', 'gin'], ingredients: [category('gin', 50), category('liqueur', 15), pantry('lemon_juice', 25), pantry('egg_white', 20)] },
  { id: 'last-word', name: 'Last Word', method: 'shake', glassware: 'coupe', ice: 'up', garnish: [], preparationSeconds: 90, complexity: 4, tags: ['classic', 'herbal', 'gin'], ingredients: [category('gin', 22), category('liqueur', 44), pantry('lime_juice', 22)] },
  { id: 'corpse-reviver-2', name: 'Corpse Reviver No. 2', method: 'shake', glassware: 'coupe', ice: 'up', garnish: ['orange peel'], preparationSeconds: 100, complexity: 4, tags: ['classic', 'citrus', 'gin'], ingredients: [category('gin', 22), category('liqueur', 22), category('vermouth_aperitif', 22), pantry('lemon_juice', 22), pantry('orange_peel', 1, 'piece')] },
  { id: 'gin-fizz', name: 'Gin Fizz', method: 'shake', glassware: 'highball', ice: 'none', garnish: [], preparationSeconds: 105, complexity: 3, tags: ['classic', 'long', 'gin'], ingredients: [category('gin', 45), pantry('lemon_juice', 30), pantry('sugar_syrup', 15), pantry('egg_white', 20), pantry('soda', 60)] },
  { id: 'singapore-sling', name: 'Singapore Sling', method: 'shake', glassware: 'highball', ice: 'cube', garnish: ['cocktail cherry'], preparationSeconds: 125, complexity: 5, tags: ['classic', 'tropical', 'gin'], ingredients: [category('gin', 30), category('liqueur', 30), category('amaro_bitter', 8), pantry('pineapple_juice', 120), pantry('lime_juice', 15), pantry('grenadine', 10), pantry('cocktail_cherry', 1, 'piece')] },

  { id: 'daiquiri', name: 'Daiquiri', method: 'shake', glassware: 'coupe', ice: 'up', garnish: ['lime wedge'], preparationSeconds: 70, complexity: 2, tags: ['classic', 'sour', 'rum'], ingredients: [category('rum', 60), pantry('lime_juice', 25), pantry('sugar_syrup', 15), pantry('lime_wedge', 1, 'piece')] },
  { id: 'mojito', name: 'Mojito', method: 'build', glassware: 'highball', ice: 'crushed', garnish: ['mint', 'lime wedge'], preparationSeconds: 110, complexity: 3, tags: ['classic', 'long', 'rum'], ingredients: [category('rum', 50), pantry('lime_juice', 25), pantry('sugar_syrup', 15), pantry('soda', 60), pantry('mint', 10, 'piece'), pantry('lime_wedge', 1, 'piece')] },
  { id: 'cuba-libre', name: 'Cuba Libre', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['lime wedge'], preparationSeconds: 45, complexity: 1, tags: ['long', 'rum'], ingredients: [category('rum', 50), pantry('cola', 120), pantry('lime_juice', 10), pantry('lime_wedge', 1, 'piece')] },
  { id: 'dark-stormy', name: "Dark 'n' Stormy", method: 'build', glassware: 'highball', ice: 'cube', garnish: ['lime wedge'], preparationSeconds: 50, complexity: 2, tags: ['long', 'spicy', 'rum'], ingredients: [category('rum', 60), pantry('ginger_beer', 100), pantry('lime_juice', 15), pantry('lime_wedge', 1, 'piece')] },
  { id: 'mai-tai', name: 'Mai Tai', method: 'shake', glassware: 'rocks', ice: 'crushed', garnish: ['mint', 'lime wedge'], preparationSeconds: 115, complexity: 4, tags: ['classic', 'tiki', 'rum'], ingredients: [category('rum', 60), category('liqueur', 15), pantry('lime_juice', 30), pantry('orgeat', 15), pantry('sugar_syrup', 8), pantry('mint', 4, 'piece'), pantry('lime_wedge', 1, 'piece')] },
  { id: 'pina-colada', name: 'Piña Colada', method: 'blend', glassware: 'hurricane', ice: 'crushed', garnish: ['pineapple'], preparationSeconds: 120, complexity: 3, tags: ['tropical', 'frozen', 'rum'], ingredients: [category('rum', 50), pantry('pineapple_juice', 90), pantry('coconut_cream', 30), pantry('orange_slice', 1, 'piece')] },
  { id: 'hurricane', name: 'Hurricane', method: 'shake', glassware: 'hurricane', ice: 'cube', garnish: ['orange slice'], preparationSeconds: 110, complexity: 4, tags: ['tropical', 'long', 'rum'], ingredients: [category('rum', 75), pantry('passion_fruit', 30), pantry('orange_juice', 45), pantry('lime_juice', 20), pantry('grenadine', 10), pantry('orange_slice', 1, 'piece')] },
  { id: 'zombie', name: 'Zombie', method: 'shake', glassware: 'tiki', ice: 'crushed', garnish: ['mint'], preparationSeconds: 145, complexity: 5, tags: ['classic', 'tiki', 'strong', 'rum'], ingredients: [category('rum', 90), category('liqueur', 15), pantry('lime_juice', 25), pantry('pineapple_juice', 45), pantry('grenadine', 10), pantry('spice_mix', 2, 'g'), pantry('mint', 4, 'piece')] },
  { id: 'planters-punch', name: "Planter's Punch", method: 'shake', glassware: 'highball', ice: 'cube', garnish: ['orange slice'], preparationSeconds: 100, complexity: 3, tags: ['classic', 'tropical', 'rum'], ingredients: [category('rum', 60), pantry('lime_juice', 25), pantry('sugar_syrup', 15), pantry('pineapple_juice', 60), pantry('spice_mix', 1, 'g'), pantry('orange_slice', 1, 'piece')] },
  { id: 'el-presidente', name: 'El Presidente', method: 'stir', glassware: 'coupe', ice: 'up', garnish: ['orange peel'], preparationSeconds: 90, complexity: 4, tags: ['classic', 'spirit-forward', 'rum'], ingredients: [category('rum', 45), category('vermouth_aperitif', 25), category('liqueur', 10), pantry('grenadine', 5), pantry('orange_peel', 1, 'piece')] },

  { id: 'margarita', name: 'Margarita', method: 'shake', glassware: 'coupe', ice: 'up', garnish: ['salt', 'lime wedge'], preparationSeconds: 85, complexity: 3, tags: ['classic', 'sour', 'agave'], ingredients: [category('agave_spirit', 50), category('liqueur', 25), pantry('lime_juice', 25), pantry('salt', 2, 'g'), pantry('lime_wedge', 1, 'piece')] },
  { id: 'paloma', name: 'Paloma', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['salt', 'lime wedge'], preparationSeconds: 60, complexity: 2, tags: ['long', 'refreshing', 'agave'], ingredients: [category('agave_spirit', 50), pantry('orange_juice', 40), pantry('lime_juice', 15), pantry('soda', 80), pantry('salt', 1, 'g'), pantry('lime_wedge', 1, 'piece')] },
  { id: 'tequila-sunrise', name: 'Tequila Sunrise', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['orange slice'], preparationSeconds: 55, complexity: 2, tags: ['long', 'fruity', 'agave'], ingredients: [category('agave_spirit', 50), pantry('orange_juice', 100), pantry('grenadine', 15), pantry('orange_slice', 1, 'piece')] },
  { id: 'tommys-margarita', name: "Tommy's Margarita", method: 'shake', glassware: 'rocks', ice: 'cube', garnish: ['lime wedge'], preparationSeconds: 80, complexity: 3, tags: ['modern-classic', 'sour', 'agave'], ingredients: [category('agave_spirit', 60), pantry('lime_juice', 30), pantry('honey_syrup', 15), pantry('lime_wedge', 1, 'piece')] },
  { id: 'mezcal-negroni', name: 'Mezcal Negroni', method: 'stir', glassware: 'rocks', ice: 'large_cube', garnish: ['orange peel'], preparationSeconds: 80, complexity: 3, tags: ['modern-classic', 'bitter', 'agave'], ingredients: [category('agave_spirit', 30), category('vermouth_aperitif', 30), category('amaro_bitter', 30), pantry('orange_peel', 1, 'piece')] },

  { id: 'moscow-mule', name: 'Moscow Mule', method: 'build', glassware: 'mug', ice: 'cube', garnish: ['lime wedge'], preparationSeconds: 50, complexity: 1, tags: ['long', 'spicy', 'vodka'], ingredients: [category('vodka', 50), pantry('ginger_beer', 100), pantry('lime_juice', 15), pantry('lime_wedge', 1, 'piece')] },
  { id: 'cosmopolitan', name: 'Cosmopolitan', method: 'shake', glassware: 'martini', ice: 'up', garnish: ['orange peel'], preparationSeconds: 85, complexity: 3, tags: ['modern-classic', 'fruity', 'vodka'], ingredients: [category('vodka', 40), category('liqueur', 20), pantry('cranberry_juice', 30), pantry('lime_juice', 15), pantry('orange_peel', 1, 'piece')] },
  { id: 'bloody-mary', name: 'Bloody Mary', method: 'roll', glassware: 'highball', ice: 'cube', garnish: ['celery'], preparationSeconds: 120, complexity: 4, tags: ['savory', 'brunch', 'vodka'], ingredients: [category('vodka', 45), pantry('tomato_juice', 100), pantry('lemon_juice', 15), pantry('spice_mix', 3, 'g'), pantry('salt', 1, 'g'), pantry('celery', 1, 'piece')] },
  { id: 'white-russian', name: 'White Russian', method: 'build', glassware: 'rocks', ice: 'cube', garnish: [], preparationSeconds: 45, complexity: 2, tags: ['dessert', 'vodka'], ingredients: [category('vodka', 50), category('liqueur', 25), pantry('cream', 25)] },
  { id: 'black-russian', name: 'Black Russian', method: 'build', glassware: 'rocks', ice: 'cube', garnish: [], preparationSeconds: 35, complexity: 1, tags: ['spirit-forward', 'vodka'], ingredients: [category('vodka', 50), category('liqueur', 25)] },
  { id: 'espresso-martini', name: 'Espresso Martini', method: 'shake', glassware: 'martini', ice: 'up', garnish: [], preparationSeconds: 105, complexity: 4, tags: ['modern-classic', 'coffee', 'vodka'], ingredients: [category('vodka', 40), category('liqueur', 20), pantry('coffee', 30), pantry('sugar_syrup', 10)] },
  { id: 'vodka-martini', name: 'Vodka Martini', method: 'stir', glassware: 'martini', ice: 'up', garnish: ['olive'], preparationSeconds: 80, complexity: 3, tags: ['classic', 'dry', 'vodka'], ingredients: [category('vodka', 60), category('vermouth_aperitif', 10), pantry('olive', 1, 'piece')] },
  { id: 'sea-breeze', name: 'Sea Breeze', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['lime wedge'], preparationSeconds: 45, complexity: 1, tags: ['long', 'fruity', 'vodka'], ingredients: [category('vodka', 40), pantry('cranberry_juice', 80), pantry('orange_juice', 40), pantry('lime_wedge', 1, 'piece')] },
  { id: 'sex-on-the-beach', name: 'Sex on the Beach', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['orange slice'], preparationSeconds: 55, complexity: 2, tags: ['long', 'fruity', 'vodka'], ingredients: [category('vodka', 40), category('liqueur', 20), pantry('orange_juice', 50), pantry('cranberry_juice', 50), pantry('orange_slice', 1, 'piece')] },

  { id: 'brandy-alexander', name: 'Brandy Alexander', method: 'shake', glassware: 'coupe', ice: 'up', garnish: [], preparationSeconds: 85, complexity: 3, tags: ['classic', 'dessert', 'brandy'], ingredients: [category('brandy', 30), category('liqueur', 30), pantry('cream', 30)] },
  { id: 'sidecar', name: 'Sidecar', method: 'shake', glassware: 'coupe', ice: 'up', garnish: ['orange peel'], preparationSeconds: 80, complexity: 3, tags: ['classic', 'sour', 'brandy'], ingredients: [category('brandy', 50), category('liqueur', 25), pantry('lemon_juice', 25), pantry('orange_peel', 1, 'piece')] },
  { id: 'vieux-carre', name: 'Vieux Carré', method: 'stir', glassware: 'rocks', ice: 'large_cube', garnish: ['lemon twist'], preparationSeconds: 105, complexity: 5, tags: ['classic', 'spirit-forward', 'brandy'], ingredients: [category('whisky', 30), category('brandy', 30), category('vermouth_aperitif', 30), category('liqueur', 8), category('amaro_bitter', 2), pantry('lemon_twist', 1, 'piece')] },

  { id: 'aperol-spritz', name: 'Aperol Spritz', method: 'build', glassware: 'wine', ice: 'cube', garnish: ['orange slice'], preparationSeconds: 45, complexity: 1, tags: ['spritz', 'sparkling', 'aperitif'], ingredients: [category('amaro_bitter', 60), category('sparkling_wine', 90), pantry('soda', 30), pantry('orange_slice', 1, 'piece')] },
  { id: 'americano', name: 'Americano', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['orange slice'], preparationSeconds: 45, complexity: 1, tags: ['classic', 'bitter', 'aperitif'], ingredients: [category('amaro_bitter', 30), category('vermouth_aperitif', 30), pantry('soda', 60), pantry('orange_slice', 1, 'piece')] },
  { id: 'bellini', name: 'Bellini', method: 'build', glassware: 'flute', ice: 'up', garnish: [], preparationSeconds: 40, complexity: 2, tags: ['sparkling', 'brunch', 'wine'], ingredients: [category('sparkling_wine', 100), pantry('passion_fruit', 30)] },
  { id: 'mimosa', name: 'Mimosa', method: 'build', glassware: 'flute', ice: 'up', garnish: ['orange slice'], preparationSeconds: 30, complexity: 1, tags: ['sparkling', 'brunch', 'wine'], ingredients: [category('sparkling_wine', 75), pantry('orange_juice', 75), pantry('orange_slice', 1, 'piece')] },
  { id: 'kir-royale', name: 'Kir Royale', method: 'build', glassware: 'flute', ice: 'up', garnish: [], preparationSeconds: 35, complexity: 1, tags: ['sparkling', 'wine'], ingredients: [category('sparkling_wine', 100), category('liqueur', 15)] },
  { id: 'hugo-spritz', name: 'Hugo Spritz', method: 'build', glassware: 'wine', ice: 'cube', garnish: ['mint', 'lime wedge'], preparationSeconds: 55, complexity: 2, tags: ['spritz', 'sparkling', 'refreshing'], ingredients: [category('sparkling_wine', 90), category('liqueur', 20), pantry('soda', 30), pantry('mint', 4, 'piece'), pantry('lime_wedge', 1, 'piece')] },

  { id: 'caipirinha', name: 'Caipirinha', method: 'build', glassware: 'rocks', ice: 'crushed', garnish: ['lime wedge'], preparationSeconds: 80, complexity: 2, tags: ['classic', 'sour', 'rum'], ingredients: [category('rum', 60), pantry('lime_juice', 30), pantry('sugar_syrup', 18), pantry('lime_wedge', 1, 'piece')] },
  { id: 'pisco-sour', name: 'Pisco Sour', method: 'shake', glassware: 'coupe', ice: 'up', garnish: [], preparationSeconds: 110, complexity: 4, tags: ['classic', 'sour', 'brandy'], ingredients: [category('brandy', 60), pantry('lime_juice', 30), pantry('sugar_syrup', 20), pantry('egg_white', 20), category('amaro_bitter', 2)] },
  { id: 'amaretto-sour', name: 'Amaretto Sour', method: 'shake', glassware: 'rocks', ice: 'cube', garnish: ['lemon twist'], preparationSeconds: 100, complexity: 3, tags: ['sour', 'liqueur'], ingredients: [category('liqueur', 45), category('whisky', 20), pantry('lemon_juice', 30), pantry('sugar_syrup', 10), pantry('egg_white', 15), pantry('lemon_twist', 1, 'piece')] },
  { id: 'long-island-iced-tea', name: 'Long Island Iced Tea', method: 'build', glassware: 'highball', ice: 'cube', garnish: ['lemon wedge'], preparationSeconds: 105, complexity: 4, tags: ['long', 'strong', 'mixed-base'], ingredients: [category('vodka', 15), category('gin', 15), category('rum', 15), category('agave_spirit', 15), category('liqueur', 15), pantry('lemon_juice', 25), pantry('sugar_syrup', 15), pantry('cola', 45), pantry('lemon_wedge', 1, 'piece')] },
  { id: 'paper-plane', name: 'Paper Plane', method: 'shake', glassware: 'coupe', ice: 'up', garnish: [], preparationSeconds: 90, complexity: 4, tags: ['modern-classic', 'bitter', 'whisky'], ingredients: [category('whisky', 22), category('amaro_bitter', 44), category('liqueur', 22), pantry('lemon_juice', 22)] },
  { id: 'penicillin', name: 'Penicillin', method: 'shake', glassware: 'rocks', ice: 'large_cube', garnish: ['lemon twist'], preparationSeconds: 115, complexity: 4, tags: ['modern-classic', 'smoky', 'whisky'], ingredients: [category('whisky', 60), pantry('lemon_juice', 25), pantry('honey_syrup', 20), pantry('ginger_ale', 10), pantry('lemon_twist', 1, 'piece')] },
  { id: 'pornstar-martini', name: 'Pornstar Martini', method: 'shake', glassware: 'coupe', ice: 'up', garnish: [], preparationSeconds: 110, complexity: 4, tags: ['modern-classic', 'fruity', 'vodka'], ingredients: [category('vodka', 40), category('liqueur', 20), pantry('passion_fruit', 30), pantry('lime_juice', 15), pantry('sugar_syrup', 10), category('sparkling_wine', 50)] },
];

export function pantryDefinition(tag: string): CocktailPantryDefinition | undefined {
  return cocktailPantryCatalog.find((item) => item.tag === tag);
}

export function cocktailRecipe(id: string): CocktailRecipeDefinition | undefined {
  return cocktailRecipes.find((item) => item.id === id);
}

export function validateCocktailCatalog(categoryIds: Set<string>): string[] {
  const errors: string[] = [];
  const seenRecipes = new Set<string>();
  const pantryTags = new Set(cocktailPantryCatalog.map((item) => item.tag));
  const seenPantry = new Set<string>();
  for (const item of cocktailPantryCatalog) {
    if (seenPantry.has(item.tag)) errors.push(`pantry: повторяющийся tag ${item.tag}`);
    seenPantry.add(item.tag);
    if (item.openingStock < 0 || item.targetStock < item.reorderPoint || item.unitCost < 0 || item.shelfLifeDays < 1) errors.push(`pantry ${item.tag}: некорректная экономика`);
  }
  for (const recipe of cocktailRecipes) {
    if (seenRecipes.has(recipe.id)) errors.push(`cocktail: повторяющийся id ${recipe.id}`);
    seenRecipes.add(recipe.id);
    if (!recipe.ingredients.length) errors.push(`${recipe.id}: нет ингредиентов`);
    if (recipe.preparationSeconds < 15 || recipe.complexity < 1 || recipe.complexity > 5) errors.push(`${recipe.id}: некорректная сложность или время`);
    for (const ingredient of recipe.ingredients) {
      const selectors = [ingredient, ...(ingredient.alternatives ?? [])];
      if (ingredient.amount <= 0) errors.push(`${recipe.id}: количество ингредиента должно быть больше нуля`);
      if (!ingredient.productId && !ingredient.categoryId && !ingredient.pantryTag) errors.push(`${recipe.id}: ингредиент без источника`);
      for (const selector of selectors) {
        if (selector.categoryId && !categoryIds.has(selector.categoryId)) errors.push(`${recipe.id}: неизвестная категория ${selector.categoryId}`);
        if (selector.pantryTag && !pantryTags.has(selector.pantryTag)) errors.push(`${recipe.id}: неизвестный pantry tag ${selector.pantryTag}`);
      }
      if (ingredient.pantryTag) {
        const definition = pantryDefinition(ingredient.pantryTag);
        if (definition && definition.unit !== ingredient.unit) errors.push(`${recipe.id}: ${ingredient.pantryTag} ожидает ${definition.unit}, получено ${ingredient.unit}`);
      } else if (ingredient.unit !== 'ml') errors.push(`${recipe.id}: товарный ингредиент должен измеряться в ml`);
    }
  }
  return errors;
}
