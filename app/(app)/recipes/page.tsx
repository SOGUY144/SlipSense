"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, triggerHaptic, cn } from "@/lib/utils";
import { AddRecipeModal } from "@/components/recipes/add-recipe-modal";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  ChefHat,
  TrendingUp,
  Percent,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

interface RecipeItem {
  id: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  cost: string;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  sellingPrice: string;
  totalCost: string;
  marginPercent: string;
  createdAt: string;
  items?: RecipeItem[];
  recipeItems?: RecipeItem[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRecipes = async () => {
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.data || data || []);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleDeleteRecipe = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบสูตร "${name}" ใช่หรือไม่?`)) return;

    setDeletingId(id);
    try {
      triggerHaptic("light");
      const res = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        triggerHaptic("success");
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert("ไม่สามารถลบสูตรได้");
      }
    } catch (error) {
      console.error("Failed to delete recipe:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [recipes]);

  // Statistics
  const stats = useMemo<{
    totalCount: number;
    avgMargin: number;
    topProfitRecipe: Recipe | null;
  }>(() => {
    const totalCount = recipes.length;
    if (totalCount === 0) {
      return { totalCount: 0, avgMargin: 0, topProfitRecipe: null };
    }

    const marginSum = recipes.reduce((acc, r) => acc + (Number(r.marginPercent) || 0), 0);
    const avgMargin = marginSum / totalCount;

    let topProfitRecipe: Recipe | null = null;
    let maxProfit = -Infinity;

    recipes.forEach((r) => {
      const profit = (Number(r.sellingPrice) || 0) - (Number(r.totalCost) || 0);
      if (profit > maxProfit) {
        maxProfit = profit;
        topProfitRecipe = r;
      }
    });

    return { totalCount, avgMargin, topProfitRecipe };
  }, [recipes]);

  // Filtered Recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [recipes, searchQuery, selectedCategory]);

  const toggleExpand = (id: string) => {
    triggerHaptic("light");
    setExpandedRecipeId((prev) => (prev === id ? null : id));
  };

  return (
    <PullToRefresh onRefresh={fetchRecipes}>
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 rounded-xl shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate flex items-center gap-1.5">
                <ChefHat className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>คำนวณต้นทุน & สูตรอาหาร</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                คำนวณต้นทุนวัตถุดิบ ราคาขาย และอัตรากำไรอัตโนมัติ
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              triggerHaptic("light");
              setAddModalOpen(true);
            }}
            size="sm"
            className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 text-xs shrink-0 shadow-xs h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>สร้างสูตร</span>
          </Button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl bg-white">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1">
                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />
                จำนวนสูตร
              </span>
              <p className="text-lg sm:text-2xl font-extrabold text-slate-800 font-number">
                {stats.totalCount}{" "}
                <span className="text-xs font-normal text-slate-400">เมนู</span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                กำไรเฉลี่ย
              </span>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 font-number">
                {stats.avgMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl bg-white">
            <CardContent className="p-3 sm:p-4 space-y-1">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                เมนูกำไรสูงสุด
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                {stats.topProfitRecipe ? stats.topProfitRecipe.name : "-"}
              </p>
              {stats.topProfitRecipe && (
                <p className="text-[10px] font-bold text-emerald-600">
                  +฿{formatCurrency((Number(stats.topProfitRecipe.sellingPrice) || 0) - (Number(stats.topProfitRecipe.totalCost) || 0))}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อเมนู..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-2xl border-slate-200 bg-white text-xs"
              />
            </div>

            {categoriesList.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 rounded-2xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">ทุกหมวดหมู่</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Recipes List */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">กำลังโหลดสูตรอาหาร...</span>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-white rounded-3xl">
              <CardContent className="p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600">
                  <ChefHat className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-700">ยังไม่มีสูตรอาหารที่บันทึก</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    เพิ่มเมนูของคุณพร้อมรายการวัตถุดิบ ระบบจะคำนวณต้นทุนต่อจานและ Margin กำไรให้ทันที
                  </p>
                </div>
                <Button
                  onClick={() => {
                    triggerHaptic("light");
                    setAddModalOpen(true);
                  }}
                  size="sm"
                  className="rounded-2xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  สร้างสูตรแรก
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRecipes.map((recipe) => {
                const isExpanded = expandedRecipeId === recipe.id;
                const itemsList = recipe.items || recipe.recipeItems || [];
                const sellingPrice = Number(recipe.sellingPrice) || 0;
                const totalCost = Number(recipe.totalCost) || 0;
                const profit = sellingPrice - totalCost;
                const marginPercent = Number(recipe.marginPercent) || 0;

                return (
                  <Card
                    key={recipe.id}
                    className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-3xl bg-white overflow-hidden transition-all"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800">{recipe.name}</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {recipe.category || "อาหาร/สินค้า"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                          disabled={deletingId === recipe.id}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 rounded-xl hover:bg-rose-50"
                          title="ลบสูตร"
                        >
                          {deletingId === recipe.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Main Financial Numbers */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl text-center">
                        <div>
                          <p className="text-[10px] text-slate-400">ราคาขาย</p>
                          <p className="text-xs sm:text-sm font-bold text-slate-800">
                            ฿{sellingPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">ต้นทุนรวม</p>
                          <p className="text-xs sm:text-sm font-bold text-rose-600">
                            ฿{totalCost.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">กำไร/จาน</p>
                          <p className="text-xs sm:text-sm font-bold text-emerald-600">
                            ฿{profit.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Margin</p>
                          <p className="text-xs sm:text-sm font-black text-amber-600">
                            {marginPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Toggle Ingredient Breakdown */}
                      <button
                        onClick={() => toggleExpand(recipe.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 pt-1 hover:text-slate-800 transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          ส่วนผสมวัตถุดิบ ({itemsList.length} รายการ)
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Ingredient Items Table / Breakdown */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                          {itemsList.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="flex items-center justify-between text-xs p-2 bg-slate-50/70 rounded-xl"
                            >
                              <span className="font-medium text-slate-700">
                                {item.ingredientName}
                              </span>
                              <div className="flex items-center gap-3 text-slate-500">
                                <span>
                                  {item.quantity} {item.unit}
                                </span>
                                <span className="font-bold text-slate-700 min-w-[50px] text-right">
                                  ฿{Number(item.cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddRecipeModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={fetchRecipes}
      />
    </PullToRefresh>
  );
}
