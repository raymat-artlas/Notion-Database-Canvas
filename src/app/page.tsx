'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Menu, X, Mail, Star, Users, Key, CheckCircle, Zap, Gift } from 'lucide-react';
import { getCampaignInfo } from '@/lib/campaignConfig';
import DemoCanvas from '@/components/DemoCanvas';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [campaignInfo, setCampaignInfo] = useState<any>(null);

  useEffect(() => {
    setCampaignInfo(getCampaignInfo());
  }, []);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('メールアドレスを入力してください');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3002' 
        : '';
        
      const response = await fetch(`${baseUrl}/api/waitlist/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('ウェイトリストに登録しました！正式リリース時にご案内をお送りします。');
        setEmail('');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      } else {
        setMessage(result.error || '登録に失敗しました。もう一度お試しください。');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
    } catch (error) {
      setMessage('登録に失敗しました。もう一度お試しください。');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Header */}
      <header className="w-full absolute top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">Notion Database Canvas</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-white/80 hover:text-white font-medium">機能</a>
            <a href="#pricing" className="text-white/80 hover:text-white font-medium">料金</a>
            <a href="#demo" className="text-white/80 hover:text-white font-medium">使い方</a>
            <Link 
              href="/access-code"
              className="text-white/80 hover:text-white font-medium"
            >
              ログイン
            </Link>
            <Link
              href="#waitlist"
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-full font-medium hover:bg-white/30 transition-colors"
            >
              登録
            </Link>
            <Link
              href="/access-code"
              className="text-white/80 hover:text-white font-medium text-sm"
            >
              テストユーザーはこちら
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-white"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-black/40 backdrop-blur-sm">
            <div className="px-6 py-4 space-y-4">
              <a href="#features" className="block text-white/80 font-medium">機能</a>
              <a href="#pricing" className="block text-white/80 font-medium">料金</a>
              <a href="#demo" className="block text-white/80 font-medium">使い方</a>
              <Link href="/access-code" className="block text-white/80 font-medium">ログイン</Link>
              <Link
                href="#waitlist"
                className="block bg-white/20 text-white px-6 py-2 rounded-full font-medium text-center"
              >
                登録
              </Link>
              <Link
                href="/access-code"
                className="block text-white/80 font-medium text-sm text-center"
              >
                テストユーザーはこちら
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section with Canvas Background */}
      <section className="relative pt-0 pb-32 px-6 overflow-hidden">
        {/* Background - Image/Video ready */}
        <div className="absolute inset-0">
          {/* 
          スクリーンショット/動画用エリア - 後で置き換え可能
          
          動画の場合:
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/path/to/your/video.mp4" type="video/mp4" />
          </video>
          
          画像の場合:
          <img 
            src="/path/to/your/screenshot.png" 
            alt="Notion Database Canvas"
            className="absolute inset-0 w-full h-full object-cover"
          />
          */}
          
          {/* 背景画像 */}
          <img 
            src="/hero-bg.png" 
            alt="Notion Database Canvas" 
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          
          {/* グラデーションオーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-gray-800/60 to-slate-900/60">
            <div className="absolute inset-0 opacity-30" style={{ display: 'none' }}>
              {/* Canvas Grid Background */}
              <div className="w-full h-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              
              {/* Database Table Cards */}
              <div className="absolute top-20 left-20 w-48 h-32 bg-white rounded-xl shadow-lg border border-gray-200 p-4 transform rotate-2">
                <div className="text-sm font-semibold text-gray-800 mb-2">Users</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>id</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>email</span>
                  </div>
                </div>
              </div>

              <div className="absolute top-40 right-32 w-48 h-32 bg-white rounded-xl shadow-lg border border-gray-200 p-4 transform -rotate-1">
                <div className="text-sm font-semibold text-gray-800 mb-2">Projects</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>id</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>title</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>user_id</span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-32 left-32 w-48 h-32 bg-white rounded-xl shadow-lg border border-gray-200 p-4 transform rotate-1">
                <div className="text-sm font-semibold text-gray-800 mb-2">Tasks</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>id</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>title</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>project_id</span>
                  </div>
                </div>
              </div>

              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" opacity="0.6" />
                  </marker>
                </defs>
                <line x1="200" y1="180" x2="400" y2="260" stroke="#8b5cf6" strokeWidth="2" opacity="0.6" markerEnd="url(#arrowhead)" />
                <line x1="400" y1="320" x2="250" y2="400" stroke="#8b5cf6" strokeWidth="2" opacity="0.6" markerEnd="url(#arrowhead)" />
              </svg>
            </div>
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center pt-32">
          <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-8">
            Notionデータベースの、
            <br />
            新しい作り方。
          </h1>
          <p className="text-xl lg:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
複雑なNotionデータベースでも簡単設計。
            <br />
            あなたのアイデアを瞬時にNotionに展開します。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#waitlist"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              無料で始める
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#demo"
              className="text-gray-300 hover:text-white font-medium text-lg inline-flex items-center gap-2"
            >
              実際の操作を見る
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          
          {/* Waitlist Button */}
          <div className="mt-12">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-full font-medium hover:bg-white/20 transition-all"
            >
              <Mail className="w-5 h-5" />
              ウェイトリストに登録する
            </a>
          </div>
        </div>
      </section>

      {/* Feature Showcase - 3 Blocks */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Block 1 - Visual Design */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              {/* Content Area */}
              <div className="aspect-square bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 p-6 relative flex items-center justify-center">
                <img 
                  src="/step1.png" 
                  alt="ビジュアルデータベース設計" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              {/* Description */}
              <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 mb-3">直感的なキャンバス設計</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  テーブル構造を視覚的に配置し、プロパティやリレーションを簡単に設定。複雑なデータベース設計も直感的に行えます。
                </p>
              </div>
            </div>

            {/* Block 2 - Notion Integration */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              {/* Content Area */}
              <div className="aspect-square bg-gradient-to-br from-purple-200 via-violet-100 to-indigo-100 p-6 relative flex items-center justify-center">
                <img 
                  src="/step2.png" 
                  alt="Notionへの自動エクスポート" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              {/* Description */}
              <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 mb-3">シームレスなエクスポート</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  設計したデータベース構造をNotionに自動展開。テーブル、プロパティ、リレーションがそのまま反映されます。
                </p>
              </div>
            </div>

            {/* Block 3 - Team Collaboration */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              {/* Content Area */}
              <div className="aspect-square bg-gradient-to-br from-purple-300 via-indigo-200 to-violet-200 p-6 relative flex items-center justify-center">
                <img 
                  src="/step3.png" 
                  alt="完成したNotionデータベース" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              {/* Description */}
              <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 mb-3">完成したデータベース</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  設計したデータベースがNotionで完璧に動作。すぐにデータ入力や運用を開始できます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section - Modulify Style */}
      <section id="waitlist" className="py-24 px-6 bg-gray-50" style={{
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Early Access Campaign */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium mb-6 shadow-lg">
              <Gift className="w-5 h-5" />
              早期登録特典
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              7日間プレミアム体験
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              ウェイトリスト登録者には、<br className="hidden md:inline" />
              リリース時に7日間のプレミアム体験をプレゼント
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">無制限キャンバス作成</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">無制限のエクスポート回数</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">キャンバスの永久保存</span>
              </div>
            </div>
          </div>
          
          {/* Main Input - Purple Border Design */}
          <div className="max-w-2xl mx-auto mb-6">
            <form onSubmit={handleWaitlistSubmit} className="relative">
              <div className="bg-gradient-to-r from-purple-200 to-pink-200 p-1 rounded-full">
                <div className="flex items-center bg-white rounded-full p-2">
                  <div className="flex items-center gap-3 pl-6 pr-4 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <input
                      type="email"
                      placeholder="ウェイトリストに参加する"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 text-gray-700 placeholder-gray-400 border-none outline-none text-lg"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-8 py-4 rounded-full font-semibold transition-all ${
                      isSubmitting
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {isSubmitting ? '登録中...' : '参加する'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Surprise Me Button */}
          <div className="mb-12">
            <Link
              href="/access-code"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-full text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all bg-white shadow-sm"
            >
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <Key className="w-3 h-3 text-white" />
              </div>
              アクセスコードをお持ちの方
            </Link>
          </div>

          {/* Modern Notification Popup */}
          {showNotification && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className={`relative max-w-md w-full mx-4 bg-gradient-to-br ${
                message.includes('失敗')
                  ? 'from-red-500/20 to-pink-500/20'
                  : 'from-purple-500/20 to-pink-500/20'
              } backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 overflow-hidden`}>
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                
                <div className="relative text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    message.includes('失敗')
                      ? 'bg-gradient-to-br from-red-500 to-pink-500'
                      : 'bg-gradient-to-br from-green-400 to-emerald-500'
                  } shadow-lg`}>
                    {message.includes('失敗') ? (
                      <X className="w-10 h-10 text-white" />
                    ) : (
                      <CheckCircle className="w-10 h-10 text-white" />
                    )}
                  </div>
                  
                  <h3 className="text-3xl font-bold text-white mb-4">
                    {message.includes('失敗') ? 'エラーが発生しました' : 'ありがとうございます！'}
                  </h3>
                  
                  <p className="text-lg text-white/80 mb-8 leading-relaxed">
                    {message}
                  </p>
                  
                  <button
                    onClick={() => setShowNotification(false)}
                    className={`px-10 py-4 rounded-full font-semibold text-white transition-all transform hover:scale-105 ${
                      message.includes('失敗')
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                    } shadow-xl`}
                  >
                    わかりました
                  </button>
                </div>
                
                {/* Close button */}
                <button
                  onClick={() => setShowNotification(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>

      </section>



      {/* Interactive Demo Section */}
      <section id="demo" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">実際にお試しください</h2>
            <p className="text-xl text-gray-600">
              インタラクティブなデモでNotion Database Canvasの魅力を体験
            </p>
          </div>
          
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 ml-2">Notion Database Canvas - デモ</span>
              </div>
            </div>
            
            <div className="relative">
              <DemoCanvas />
              <div className="absolute inset-0 bg-gradient-to-t from-white/5 via-transparent to-transparent pointer-events-none rounded-2xl"></div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-4">
                ✨ ドラッグ&ドロップでテーブルを移動 • リレーションライン描画 • プロパティ編集
              </p>
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
              >
                <Database className="w-5 h-5" />
                実際に使ってみる
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">シンプルな料金体系</h2>
            <p className="text-xl text-gray-600">
              まずは無料でスタート、必要に応じてアップグレード
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">無料プラン</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">¥0<span className="text-lg font-normal text-gray-500">/月</span></div>
              <p className="text-gray-600 mb-6">はじめて利用する方に最適</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">キャンバス 2個まで</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">月10回のエクスポート</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">すべてのプロパティタイプ</span>
                </li>
              </ul>
              
              <button className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                準備中
              </button>
            </div>
            
            {/* Premium Plan */}
            <div className="bg-purple-600 rounded-3xl p-8 text-white relative">
              <div className="absolute top-4 right-4 bg-white text-purple-600 px-3 py-1 rounded-full text-sm font-medium">
                人気
              </div>
              <h3 className="text-2xl font-bold mb-2">プレミアム</h3>
              <div className="text-4xl font-bold mb-4">¥500<span className="text-lg font-normal text-purple-200">/月</span></div>
              <p className="text-purple-100 mb-6">プロフェッショナル向け</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-200" />
                  <span>無制限キャンバス作成</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-200" />
                  <span>無制限エクスポート</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-200" />
                  <span>優先サポート</span>
                </li>
              </ul>
              
              <button className="w-full py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                準備中
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* Testimonials */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">ユーザーの声</h2>
            <p className="text-gray-600">実際にご利用いただいた開発者からのフィードバック</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-start gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                「複雑なデータベース構造も視覚的に設計できるのが素晴らしい。設計の見通しが格段に良くなりました。」
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full"></div>
                <div>
                  <p className="font-semibold text-gray-900">田中 さゆり</p>
                  <p className="text-sm text-gray-600">プロダクトマネージャー</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-start gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                「Notionへのエクスポートがワンクリックで完了するのが便利。開発時間が大幅に短縮できました。」
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full"></div>
                <div>
                  <p className="font-semibold text-gray-900">佐藤 健太</p>
                  <p className="text-sm text-gray-600">フルスタックエンジニア</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-start gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">
                「データベース設計の経験が浅い私でも、直感的に操作できました。UIがとても分かりやすいです。」
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full"></div>
                <div>
                  <p className="font-semibold text-gray-900">鈴木 美咲</p>
                  <p className="text-sm text-gray-600">スタートアップ創業者</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Notion Database Canvas</span>
          </div>
          <div className="text-gray-500 text-sm">
            © 2024 Notion Database Canvas. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}