'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Palette, Zap, Users, GitBranch, BarChart3, CheckCircle, Star, Menu, X, Clock, Gift, Sparkles, Shield, Rocket, ChevronDown } from 'lucide-react';
import { getCampaignInfo } from '@/lib/campaignConfig';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [campaignInfo, setCampaignInfo] = useState<any>(null);

  useEffect(() => {
    setCampaignInfo(getCampaignInfo());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Notion Database Canvas</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">機能</a>
              <a href="#demo" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">デモ</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">料金</a>
              <Link 
                href="/login"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
              >
                ログイン
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-600 hover:text-gray-900 transition-colors">機能</a>
              <a href="#demo" className="block text-gray-600 hover:text-gray-900 transition-colors">デモ</a>
              <a href="#pricing" className="block text-gray-600 hover:text-gray-900 transition-colors">料金</a>
              <Link 
                href="/"
                className="block bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-center"
              >
                ログイン
              </Link>
            </div>
          </div>
        )}
      </header>
      {/* Campaign Banner */}
      {campaignInfo?.isActive && (
        <div className="pt-20 pb-6 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          <div className="max-w-4xl mx-auto text-center text-white relative z-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-1 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="text-sm font-semibold tracking-wide uppercase">期間限定キャンペーン</span>
            </div>
            <p className="text-xl font-bold mb-2">
              今なら登録で<span className="text-yellow-300 text-2xl">{campaignInfo.trialDays}日間無料</span>でプレミアム機能をお試し！
            </p>
            <div className="flex items-center justify-center gap-6 mt-3 text-sm">
              <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full backdrop-blur-sm">
                <Clock className="w-4 h-4" />
                <span className="font-medium">残り{campaignInfo.remainingDays}日</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full backdrop-blur-sm">
                <Shield className="w-4 h-4" />
                <span className="font-medium">クレジットカード不要</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className={`${campaignInfo?.isActive ? 'pt-16' : 'pt-24'} pb-16 px-4 sm:px-6 lg:px-8`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {!campaignInfo?.isActive && (
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
                <span>🚀</span>
                <span>クローズドベータ版 - テストユーザー募集中</span>
              </div>
            )}
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight japanese-text">
              <span className="block bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">ビジュアル</span>
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-2">データベース設計</span>
              <span className="block text-gray-900 text-4xl md:text-5xl mt-4">の新しいカタチ</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-10 leading-relaxed max-w-4xl mx-auto">
              Notion Database Canvasは、直感的なドラッグ&ドロップでデータベースを設計できる
              <br className="hidden md:block" />
              <span className="font-semibold text-blue-700">革新的なビジュアルツール</span>です。複雑なリレーションも美しく表現。
            </p>

            {/* Campaign Active CTA */}
            {campaignInfo?.isActive && (
              <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-2 border-purple-200 rounded-3xl p-8 mb-10 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-purple-900 font-bold text-lg">期間限定特典</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-900 to-blue-900 bg-clip-text text-transparent mb-3">
                  {campaignInfo.trialDays}日間プレミアム体験
                </h3>
                <p className="text-lg text-gray-700 mb-6">
                  通常月額980円のプレミアム機能を<span className="font-bold text-purple-700">{campaignInfo.trialDays}日間無料</span>でお試しいただけます
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2 bg-white/60 p-3 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">無制限キャンバス作成</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 p-3 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">無制限のエクスポート回数</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 p-3 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">キャンバスの永久保存</span>
                  </div>
                </div>
              </div>
            )}

            {/* No Campaign CTA */}
            {!campaignInfo?.isActive && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900 font-semibold">ベータテスター募集</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  早期アクセスリスト登録
                </h3>
                <p className="text-gray-600 mb-4">
                  正式リリース前の限定アクセスと特別特典をご用意しています
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 px-10 py-5 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 shadow-2xl relative overflow-hidden"
                style={{ background: campaignInfo?.isActive ? 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #06b6d4 100%)' : 'linear-gradient(135deg, #4a8bb2 0%, #2563eb 100%)' }}>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Rocket className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">{campaignInfo?.isActive ? '無料体験を始める' : 'ベータ版に登録'}</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <button className="inline-flex items-center gap-3 px-10 py-5 bg-white/80 backdrop-blur-sm text-gray-900 rounded-2xl font-bold text-lg hover:bg-white hover:shadow-xl transition-all border-2 border-gray-200 hover:border-blue-300">
                <Zap className="w-6 h-6 text-blue-600" />
                デモを見る
              </button>
            </div>

            {campaignInfo?.isActive && (
              <p className="mt-4 text-sm text-gray-500">
                キャンペーン終了まで残り<strong>{campaignInfo.remainingDays}日</strong> | クレジットカード登録不要
              </p>
            )}
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-100 text-blue-700 rounded-full font-semibold mb-6">
              <Sparkles className="w-5 h-5" />
              <span>なぜ選ばれるのか</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent mb-6">Notion Database Canvasの特徴</h2>
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">従来のER図ツールを超えた、<span className="font-semibold text-blue-700">次世代のデータベース設計体験</span></p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-white/70 backdrop-blur-sm p-10 rounded-3xl shadow-xl border border-gray-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Palette className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">直感的なビジュアル設計</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                ドラッグ&ドロップでテーブルを配置し、美しいリレーション線でつなぐだけ。<span className="font-semibold text-blue-700">コードを書く必要はありません。</span>
              </p>
            </div>

            <div className="group bg-white/70 backdrop-blur-sm p-10 rounded-3xl shadow-xl border border-gray-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Notionへの直接エクスポート</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                設計したデータベースを<span className="font-semibold text-green-700">ワンクリックでNotionに反映</span>。データ連携も自在に設定可能。
              </p>
            </div>

            <div className="group bg-white/70 backdrop-blur-sm p-10 rounded-3xl shadow-xl border border-gray-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">安全なクラウド保存</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                作成したキャンバスは<span className="font-semibold text-orange-700">自動でクラウドに保存</span>。どこからでもアクセス可能で、データ消失の心配もありません。
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Demo Section */}
      <section id="demo" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 rounded-full font-semibold mb-6">
              <Zap className="w-5 h-5" />
              <span>実際の動作</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent mb-6">実際の操作を見てみよう</h2>
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">わずか数分で<span className="font-semibold text-purple-700">プロフェッショナルなデータベース設計</span>が完成</p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center border-2 border-gray-600/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
              <div className="text-center relative z-10">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl">
                  <Database className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">デモ動画</h3>
                <p className="text-gray-300 text-lg">実際の操作画面をご覧ください</p>
                <button className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-all">
                  <Zap className="w-5 h-5" />
                  動画を再生
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-full font-semibold mb-6">
              <Gift className="w-5 h-5" />
              <span>料金プラン</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-green-900 bg-clip-text text-transparent mb-6">シンプルな料金体系</h2>
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">まずは無料でお試しください。<span className="font-semibold text-green-700">必要に応じてアップグレード</span></p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white/80 backdrop-blur-sm p-8 md:p-10 rounded-3xl shadow-xl border-2 border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-5xl font-bold text-gray-900 mb-4">¥0</div>
                <p className="text-gray-600">個人利用や試用に最適</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">キャンバス作成 <span className="font-semibold">2個まで</span></span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Notionエクスポート <span className="font-semibold">月10回まで</span></span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">すべてのプロパティタイプ</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">自動保存機能（30日間）</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-colors"
              >
                無料で始める
              </Link>
            </div>
            
            {/* Premium Plan */}
            <div className="bg-gray-900 p-8 md:p-10 rounded-3xl shadow-xl relative">
              <div className="absolute top-4 right-4 bg-gray-700 text-gray-200 px-4 py-1 rounded-full text-sm font-medium">
                おすすめ
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
                <div className="text-5xl font-bold text-white mb-4">
                  <span className="text-2xl align-top">¥</span>320
                  <span className="text-lg font-normal">/月</span>
                </div>
                <p className="text-gray-400">チームやプロフェッショナル向け</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">キャンバス作成 <span className="font-semibold text-white">無制限</span></span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">Notionエクスポート <span className="font-semibold text-white">無制限</span></span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">優先サポート</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">優先サポート</span>
                </li>
                <li className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-300 font-medium">今後追加される新機能も利用可能</span>
                </li>
              </ul>
              <button className="block w-full text-center px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium hover:bg-gray-600 transition-colors">
                準備中
              </button>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600">
              現在、プロモーションコードをお持ちの方は<span className="font-semibold text-purple-600">Premium体験版</span>をご利用いただけます
            </p>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-100 text-yellow-700 rounded-full font-semibold mb-6">
              <Star className="w-5 h-5" />
              <span>ユーザーレビュー</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-yellow-900 bg-clip-text text-transparent mb-6">ユーザーの声</h2>
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">実際に使っている<span className="font-semibold text-yellow-700">開発者からの評価</span></p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "田中太郎",
                role: "フルスタック開発者",
                comment: "ER図ツールで苦労していた複雑なリレーションも、Notion Database Canvasなら直感的に設計できます。",
                rating: 5
              },
              {
                name: "佐藤花子",
                role: "プロダクトマネージャー",
                comment: "技術的な知識がなくても、チームとデータベース構造について議論できるようになりました。",
                rating: 5
              },
              {
                name: "鈴木一郎",
                role: "スタートアップCTO",
                comment: "プロトタイプから本格運用まで、すべてのフェーズでNotion Database Canvasが活躍しています。",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white/70 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-gray-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-1 mb-6">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 text-lg leading-relaxed font-medium">"{testimonial.comment}"</p>
                <div className="border-t border-gray-200 pt-6">
                  <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                  <div className="text-blue-600 font-medium">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-full font-semibold mb-8 backdrop-blur-sm">
            <Rocket className="w-5 h-5" />
            <span>今すぐ始める</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
            Notion Database Canvas で
            <span className="block text-yellow-300">未来のDB設計を</span>
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-12 leading-relaxed">
            無料でNotion Database Canvasを体験してみませんか？
            <br className="hidden md:block" />
            <span className="font-semibold">アクセスコードで簡単</span>にアカウント作成できます。
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-600 rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-2xl hover:shadow-white/25">
              <Rocket className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
              無料で始める
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <button className="inline-flex items-center gap-3 px-10 py-5 bg-white/20 backdrop-blur-sm text-white rounded-2xl font-bold text-xl hover:bg-white/30 transition-all border-2 border-white/30 hover:border-white/50">
              <Zap className="w-6 h-6" />
              デモを見る
            </button>
          </div>
          <p className="mt-8 text-white/80 text-lg">
            🎉 <span className="font-semibold">クレジットカード登録不要</span> | ⚡ <span className="font-semibold">30秒で開始</span>
          </p>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-4 mb-6 md:mb-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Notion Database Canvas</span>
                <div className="text-gray-400 text-sm">次世代のデータベース設計ツール</div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-gray-300 text-lg font-medium mb-2">
                © 2024 Notion Database Canvas. All rights reserved.
              </div>
              <div className="text-gray-500 text-sm">
                Made with ❤️ for developers
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}