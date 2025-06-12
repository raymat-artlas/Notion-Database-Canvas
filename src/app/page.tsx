'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Palette, Zap, Users, GitBranch, BarChart3, CheckCircle, Star, Menu, X, Mail, Gift, Clock, Sparkles } from 'lucide-react';
import { getCampaignInfo } from '@/lib/campaignConfig';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
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
      console.log('Attempting to register email:', email);
      
      // 開発環境とプロダクション環境を区別
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3002' 
        : '';
        
      const response = await fetch(`${baseUrl}/api/waitlist/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      console.log('Response status:', response.status);
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`ウェイトリストに登録しました！正式リリース時にアカウント作成のご案内をお送りします。${campaignInfo?.trialDays || 30}日間の無料体験付きです。`);
        setEmail('');
      } else {
        setMessage(result.error || '登録に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('Waitlist registration error:', error);
      setMessage('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Notion Database Canvas</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">機能</a>
              <a href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">デモ</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">料金</a>
              <Link 
                href="/access-code"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                テストユーザーはこちら
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
                href="/access-code"
                className="block text-sm text-gray-500 hover:text-gray-700 transition-colors text-center"
              >
                テストユーザーはこちら
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* ステータスバッジ */}
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700">
              <span>🚀</span>
              <span>まもなくリリース - ウェイティングリスト募集中</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              ビジュアル
              <span className="block" style={{ color: '#4a8bb2' }}>データベース設計</span>
              の新しいカタチ
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Notion Database Canvasは、直感的なドラッグ&ドロップでデータベースを設計できる
              <br className="hidden md:block" />
              革新的なビジュアルツールです。複雑なリレーションも美しく表現。
            </p>

            {/* ウェイティングリスト特典 */}
            {campaignInfo?.isActive && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Gift className="w-5 h-5 text-purple-600" />
                  <span className="text-purple-900 font-semibold">早期登録特典</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {campaignInfo.trialDays}日間プレミアム体験
                </h3>
                <p className="text-gray-600 mb-4">
                  ウェイティングリスト登録者には、リリース時に{campaignInfo.trialDays}日間のプレミアム体験をプレゼント
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <span>✓ 無制限キャンバス作成</span>
                  <span>✓ 無制限のエクスポート回数</span>
                  <span>✓ キャンバスの永久保存</span>
                </div>
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-purple-600">
                  <Clock className="w-3 h-3" />
                  <span>特典期間終了まで残り{campaignInfo.remainingDays}日</span>
                </div>
              </div>
            )}

            {/* ウェイティングリスト登録フォーム */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg mb-8 max-w-lg mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
                ウェイティングリストに登録
              </h3>
              <p className="text-gray-600 mb-5 text-center text-sm">
                正式リリース時にアカウント作成のご案内をお送りします
                <span className="block text-purple-600 font-medium mt-1">
                  30日間のプレミアム体験付き
                </span>
              </p>
              
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>登録中...</span>
                    </div>
                  ) : (
                    '無料で登録する'
                  )}
                </button>
              </form>

              {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  message.includes('失敗') 
                    ? 'bg-red-50 border border-red-200 text-red-700' 
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  <p className="text-center">{message}</p>
                </div>
              )}
            </div>

            {/* その他のアクション */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                デモを見る
                <Zap size={20} />
              </button>
            </div>
            
            {/* テストユーザー向けリンク */}
            <div className="mt-6">
              <Link 
                href="/access-code"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                テストユーザーの方はこちら →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">なぜNotion Database Canvasなのか？</h2>
            <p className="text-xl text-gray-600">従来のER図ツールを超えた、次世代のデータベース設計体験</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center" style={{ backgroundColor: '#4a8bb2' }}>
                <Palette className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">直感的なビジュアル設計</h3>
              <p className="text-gray-600">
                ドラッグ&ドロップでテーブルを配置し、美しいリレーション線でつなぐだけ。コードを書く必要はありません。
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center" style={{ backgroundColor: '#598e71' }}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Notionエクスポート</h3>
              <p className="text-gray-600">
                設計したデータベースをワンクリックでNotionに反映。データ連携も自在に設定可能。
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center" style={{ backgroundColor: '#d09b46' }}>
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">安全なクラウド保存</h3>
              <p className="text-gray-600">
                作成したキャンバスは自動でクラウドに保存。どこからでもアクセス可能で、データ消失の心配もありません。
              </p>
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
                  <span className="text-gray-300">すべてのプロパティタイプ</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">自動保存機能（永久保存）</span>
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

      {/* Demo Section */}
      <section id="demo" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">実際の操作を見てみよう</h2>
            <p className="text-xl text-gray-600">わずか数分でプロフェッショナルなデータベース設計が完成</p>
          </div>
          
          <div className="bg-gray-900 rounded-3xl p-8 md:p-12">
            <div className="aspect-video bg-gray-800 rounded-2xl flex items-center justify-center border-2 border-gray-700">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Database className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">デモ動画</h3>
                <p className="text-gray-400">実際の操作画面をご覧ください</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">ユーザーの声</h2>
            <p className="text-xl text-gray-600">実際に使っている開発者からの評価</p>
          </div>

          {/* Coming Soon: Real User Testimonials */}
          <div className="bg-gray-50 rounded-3xl p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">実際のユーザーの声をお待ちしています</h3>
              <p className="text-lg text-gray-600 mb-6">
                Notion Database Canvasを使っていただいた感想を、ぜひXでシェアしてください！<br />
                素晴らしいフィードバックはこちらに掲載させていただきます。
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-sm border border-gray-200">
                <span className="text-gray-500 text-sm">ハッシュタグ:</span>
                <span className="font-mono text-blue-600 font-medium">#DatabaseCanvas</span>
              </div>
            </div>
          </div>
          
          {/* TODO: Replace with actual testimonials when available */}
          {/* 
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <img 
                  src={`/testimonials/${testimonial.image}`} 
                  alt={`${testimonial.name}からの感想ツイート`}
                  className="w-full h-auto"
                />
              </div>
            ))}
          </div>
          */}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            早期アクセスを獲得しよう
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            ウェイティングリストに登録して、リリース時に特典付きでNotion Database Canvasを体験しませんか？
            {campaignInfo?.isActive && (
              <span className="block text-purple-600 font-medium mt-2">
                今なら{campaignInfo.trialDays}日間プレミアム体験付き！
              </span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => document.querySelector('input[type="email"]')?.focus()}
              className="inline-flex items-center gap-2 px-8 py-4 text-white rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-lg bg-purple-600 hover:bg-purple-700"
            >
              今すぐアカウント作成
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-gray-900" />
              </div>
              <span className="text-xl font-bold">Notion Database Canvas</span>
            </div>
            <div className="text-gray-400 text-sm flex items-center gap-4">
              <span>© 2024 Notion Database Canvas. All rights reserved.</span>
              <a href="/terms" className="underline hover:text-gray-200 ml-4">利用規約</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
