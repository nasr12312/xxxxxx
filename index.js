import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    limit,
    writeBatch
} from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Book, Users, FileText, BarChart2, Settings, LogOut, PlusCircle, Trash2, Edit, Upload, Eye, CheckCircle, XCircle, Search, ChevronDown, ChevronUp, Download, Info, Shield, ArrowRightCircle, ArrowLeft, Plus, X, Copy } from 'lucide-react';

// Firebase Configuration provided by the user
// إعداد Firebase المقدم من المستخدم
const firebaseConfig = {
  apiKey: "AIzaSyARXF0CljGAq2MCYm2_bkaTPHTBIZih4DU",
  authDomain: "exambel.firebaseapp.com",
  projectId: "exambel",
  storageBucket: "exambel.appspot.com",
  messagingSenderId: "846295162825",
  appId: "1:846295162825:web:c73a50955b003218aa9218",
  measurementId: "G-WNVKC1ZC47"
};


// Initialize Firebase
// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper function to log activities
// دالة مساعدة لتسجيل النشاطات
const logActivity = async (action, details) => {
    try {
        await addDoc(collection(db, "activity_logs"), {
            action,
            details,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};


// Helper function to generate random codes
// دالة مساعدة لإنشاء رموز عشوائية
const generateCode = (length = 6) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Reusable Notification Component
// مكون تنبيهات قابل لإعادة الاستخدام
function Notification({ message, type = 'success', onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const bgColor = 
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'; // Default for 'info'

    return (
        <div className={`fixed top-5 right-5 ${bgColor} text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center`}>
            <Info size={20} className="ml-3" />
            <span>{message}</span>
        </div>
    );
}

// Reusable Confirmation Modal Component
// مكون نافذة تأكيد قابلة لإعادة الاستخدام
function ConfirmationModal({ message, confirmText, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md" dir="rtl">
                <h4 className="text-xl font-bold mb-4">تأكيد الإجراء</h4>
                <p className="mb-6 text-gray-600">{message}</p>
                <div className="flex justify-end space-x-2" dir="ltr">
                    <button onClick={onCancel} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">إلغاء</button>
                    <button onClick={onConfirm} className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">{confirmText}</button>
                </div>
            </div>
        </div>
    );
}


// Main App Component
// المكون الرئيسي للتطبيق
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('login');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            if (user && !user.isAnonymous) {
                const userDocRef = doc(db, "users", user.uid);
                try {
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        setUserData({ uid: user.uid, ...docSnap.data() });
                        setUser(user);
                    } else {
                        await signOut(auth);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    await signOut(auth);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        const manageInitialSession = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else if (!auth.currentUser) {
                    await signInAnonymously(auth);
                }
            } catch (err) {
                console.error("Initial session management failed:", err);
                setLoading(false);
            }
        };

        manageInitialSession();

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">جاري التحميل...</div></div>;
    }

    if (!user || !userData) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900">
                {currentPage === 'login' ? (
                    <LoginScreen onSwitchToRegister={() => setCurrentPage('register')} />
                ) : (
                    <RegisterScreen onSwitchToLogin={() => setCurrentPage('login')} />
                )}
            </div>
        );
    }
    
    if (userData.role === 'teacher' && userData.status === 'pending') {
        return <PendingApprovalScreen onLogout={handleLogout} />;
    }

    if (userData.role === 'admin') {
        return <AdminDashboard user={user} userData={userData} onLogout={handleLogout} />;
    }

    if (userData.role === 'teacher') {
        return <TeacherDashboard user={user} userData={userData} onLogout={handleLogout} />;
    }

    return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">حدث خطأ غير متوقع.</div></div>;
}

// Login Screen Component
// مكون شاشة تسجيل الدخول
function LoginScreen({ onSwitchToRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.');
            console.error(err);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
            <div className="w-full bg-white rounded-lg shadow-xl dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white text-center">
                        تسجيل الدخول إلى حسابك
                    </h1>
                    <form className="space-y-4 md:space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">البريد الإلكتروني</label>
                            <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-right" placeholder="name@company.com" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">كلمة المرور</label>
                            <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-right" required />
                        </div>
                        {error && <p className="text-sm font-light text-red-500 dark:text-red-400 text-center">{error}</p>}
                        <button type="submit" disabled={isLoggingIn} className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:bg-blue-400">
                            {isLoggingIn ? 'جاري الدخول...' : 'تسجيل الدخول'}
                        </button>
                        <p className="text-sm font-light text-gray-500 dark:text-gray-400 text-center">
                            ليس لديك حساب؟ <button type="button" onClick={onSwitchToRegister} className="font-medium text-blue-600 hover:underline dark:text-blue-500">إنشاء حساب</button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Register Screen Component
// مكون شاشة إنشاء حساب
function RegisterScreen({ onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [workplace, setWorkplace] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setIsRegistering(true);

        try {
            const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
            const adminSnapshot = await getDocs(adminQuery);
            const isAdminExisting = !adminSnapshot.empty;

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const role = isAdminExisting ? 'teacher' : 'admin';
            const status = isAdminExisting ? 'pending' : 'approved';

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: role,
                status: status,
                workplace: workplace,
                createdAt: serverTimestamp()
            });

            await logActivity(role === 'admin' ? 'admin_registered' : 'teacher_registered', { name, email });
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('هذا البريد الإلكتروني مستخدم بالفعل.');
            } else if (err.code === 'permission-denied') {
                setError('فشل إنشاء ملف المستخدم. يرجى التحقق من صلاحيات قاعدة البيانات.');
            }
            else {
                setError('فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.');
            }
            console.error(err);
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
            <div className="w-full bg-white rounded-lg shadow-xl dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white text-center">
                        إنشاء حساب جديد
                    </h1>
                    <form className="space-y-4 md:space-y-6" onSubmit={handleRegister}>
                        <div>
                            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">الاسم الكامل</label>
                            <input type="text" name="name" id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-right" placeholder="الاسم الكامل" required />
                        </div>
                         <div>
                            <label htmlFor="workplace" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">مكان العمل (المدرسة)</label>
                            <input type="text" name="workplace" id="workplace" value={workplace} onChange={(e) => setWorkplace(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-right" placeholder="اسم المدرسة" required />
                        </div>
                        <div>
                            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">البريد الإلكتروني</label>
                            <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-right" placeholder="name@company.com" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">كلمة المرور</label>
                            <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white text-right" required />
                        </div>
                        {error && <p className="text-sm font-light text-red-500 dark:text-red-400 text-center">{error}</p>}
                        <button type="submit" disabled={isRegistering} className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:bg-blue-400">
                            {isRegistering ? 'جاري الإنشاء...' : 'إنشاء حساب'}
                        </button>
                        <p className="text-sm font-light text-gray-500 dark:text-gray-400 text-center">
                            لديك حساب بالفعل؟ <button type="button" onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:underline dark:text-blue-500">تسجيل الدخول</button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Pending Approval Screen
// شاشة انتظار الموافقة
function PendingApprovalScreen({ onLogout }) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center p-4">
            <div className="bg-white p-10 rounded-lg shadow-xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">حسابك قيد المراجعة</h1>
                <p className="text-gray-600 mb-6">لقد تم استلام طلبك، وحسابك الآن بانتظار موافقة المدير. سيتم إعلامك عند تفعيل الحساب.</p>
                <button onClick={onLogout} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">
                    تسجيل الخروج
                </button>
            </div>
        </div>
    );
}

// Admin Dashboard Component
// مكون لوحة تحكم المدير
function AdminDashboard({ user, userData, onLogout }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [viewingTeacher, setViewingTeacher] = useState(null); // To view a specific teacher's details

    const renderContent = () => {
        if (viewingTeacher) {
            return <AdminTeacherDetailView teacher={viewingTeacher} onBack={() => setViewingTeacher(null)} />;
        }
        switch (activeTab) {
            case 'dashboard':
                return <AdminSystemOverview />;
            case 'teachers':
                return <TeacherManagement adminUser={userData} onViewTeacher={setViewingTeacher} />;
            case 'content':
                return <AdminContentManagement />;
            case 'logs':
                return <AdminActivityLog />;
            case 'settings':
                return <PlatformSettings />;
            default:
                return <AdminSystemOverview />;
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'لوحة المعلومات', icon: BarChart2 },
        { id: 'teachers', label: 'إدارة المعلمين', icon: Users },
        { id: 'content', label: 'إدارة المحتوى', icon: Book },
        { id: 'logs', label: 'سجل النشاطات', icon: Activity },
        { id: 'settings', label: 'الإعدادات', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-100 font-sans" dir="rtl">
            <aside className="w-64 bg-gray-800 text-white flex flex-col">
                <div className="h-20 flex items-center justify-center border-b border-gray-700">
                    <h1 className="text-2xl font-bold flex items-center"><Shield className="w-7 h-7 ml-2 text-blue-400"/> لوحة المدير</h1>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setViewingTeacher(null); }}
                            className={`w-full flex items-center px-4 py-3 text-right rounded-lg transition-colors ${
                                activeTab === item.id && !viewingTeacher ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
                            }`}
                        >
                            <item.icon className="ml-3 h-5 w-5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <button onClick={onLogout} className="w-full flex items-center px-4 py-3 text-right rounded-lg hover:bg-red-600 transition-colors">
                        <LogOut className="ml-3 h-5 w-5" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>
            
            <main className="flex-1 flex flex-col">
                <header className="h-20 bg-white shadow-md flex items-center justify-between px-8">
                    <h2 className="text-2xl font-semibold text-gray-700">مرحباً, {userData.name}</h2>
                </header>
                <div className="flex-1 p-8 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

// Admin System Overview
function AdminSystemOverview() {
    const [stats, setStats] = useState({ teachers: 0, students: 0, exams: 0 });
    const [recentTeachers, setRecentTeachers] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            const teachersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher")));
            const studentsSnap = await getDocs(collection(db, "students"));
            const examsSnap = await getDocs(collection(db, "exams"));
            setStats({
                teachers: teachersSnap.size,
                students: studentsSnap.size,
                exams: examsSnap.size
            });
        };

        const q = query(collection(db, "users"), where("role", "==", "teacher"), orderBy("createdAt", "desc"), limit(5));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRecentTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        fetchStats();
        return () => unsubscribe();
    }, []);

    return (
        <div>
            <h3 className="text-3xl font-bold mb-6 text-gray-800">نظرة عامة على النظام</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-lg flex items-center">
                    <div className="p-4 bg-blue-100 rounded-full mr-4"><Users className="text-blue-500" size={28} /></div>
                    <div>
                        <p className="text-gray-500">إجمالي المعلمين</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.teachers}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg flex items-center">
                    <div className="p-4 bg-green-100 rounded-full mr-4"><Users className="text-green-500" size={28} /></div>
                    <div>
                        <p className="text-gray-500">إجمالي الطلاب</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.students}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg flex items-center">
                    <div className="p-4 bg-yellow-100 rounded-full mr-4"><FileText className="text-yellow-500" size={28} /></div>
                    <div>
                        <p className="text-gray-500">إجمالي الامتحانات</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.exams}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h4 className="font-bold mb-4">آخر المعلمين المسجلين</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <tbody>
                            {recentTeachers.map(teacher => (
                                <tr key={teacher.id} className="border-b last:border-b-0">
                                    <td className="p-3">{teacher.name}</td>
                                    <td className="p-3 text-gray-500">{teacher.email}</td>
                                    <td className="p-3 text-gray-500 text-sm">
                                        {teacher.createdAt?.toDate().toLocaleDateString('ar-EG')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


// Teacher Management Tab for Admin
function TeacherManagement({ adminUser, onViewTeacher }) {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "teacher"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const teachersData = [];
            querySnapshot.forEach((doc) => {
                teachersData.push({ id: doc.id, ...doc.data() });
            });
            setTeachers(teachersData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error in TeacherManagement:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (teacher, newStatus) => {
        const teacherDocRef = doc(db, "users", teacher.id);
        await updateDoc(teacherDocRef, { status: newStatus });
        await logActivity(`teacher_${newStatus}`, { teacherName: teacher.name, adminName: adminUser.name });
    };

    const handleDeleteTeacher = async () => {
        if (!showDeleteModal) return;
        
        const batch = writeBatch(db);
        
        const userDocRef = doc(db, "users", showDeleteModal.id);
        batch.delete(userDocRef);

        const collectionsToDelete = ['classes', 'students', 'exams'];
        for (const coll of collectionsToDelete) {
            const q = query(collection(db, coll), where("teacherId", "==", showDeleteModal.id));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();
        await logActivity('teacher_deleted', { teacherName: showDeleteModal.name, adminName: adminUser.name });
        setShowDeleteModal(null);
    };

    const filteredTeachers = teachers
        .filter(teacher => {
            if (filter === 'all') return true;
            return teacher.status === filter;
        })
        .filter(teacher => 
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (loading) {
        return <div>جاري تحميل قائمة المعلمين...</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            {showDeleteModal && (
                <ConfirmationModal 
                    message={`هل أنت متأكد من حذف المعلم "${showDeleteModal.name}"؟ سيتم حذف جميع بياناته بشكل دائم.`}
                    confirmText="نعم، قم بالحذف"
                    onConfirm={handleDeleteTeacher}
                    onCancel={() => setShowDeleteModal(null)}
                />
            )}
            <h3 className="text-2xl font-bold mb-6 text-gray-800">إدارة المعلمين</h3>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                    <input 
                        type="text"
                        placeholder="ابحث عن معلم بالاسم أو البريد..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pr-10 border rounded-md"
                    />
                </div>
                <div className="flex items-center space-x-2" dir="ltr">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-md text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>الكل</button>
                    <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-md text-sm ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}>بانتظار الموافقة</button>
                    <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded-md text-sm ${filter === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>المقبولون</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right text-gray-600">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4">الاسم</th>
                            <th className="p-4">مكان العمل</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeachers.length > 0 ? filteredTeachers.map(teacher => (
                            <tr key={teacher.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium">{teacher.name}</td>
                                <td className="p-4 text-gray-500">{teacher.workplace}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        teacher.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {teacher.status === 'approved' ? 'مقبول' : 'بانتظار الموافقة'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex space-x-2" dir="ltr">
                                        <button onClick={() => onViewTeacher(teacher)} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition" title="عرض التفاصيل">
                                            <Eye size={18} />
                                        </button>
                                        {teacher.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleUpdateStatus(teacher, 'approved')} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition" title="موافقة">
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button onClick={() => handleUpdateStatus(teacher, 'rejected')} className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition" title="رفض">
                                                    <XCircle size={18} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => setShowDeleteModal(teacher)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition" title="حذف">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="p-4 text-center">لا يوجد معلمون يطابقون هذا البحث.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Admin Teacher Detail View
function AdminTeacherDetailView({ teacher, onBack }) {
    return (
        <div>
            <button onClick={onBack} className="flex items-center text-blue-600 font-semibold mb-6">
                <ArrowRight className="ml-2"/> العودة إلى قائمة المعلمين
            </button>
            <h3 className="text-3xl font-bold mb-2 text-gray-800">تفاصيل المعلم: {teacher.name}</h3>
            <p className="text-gray-500 mb-6">{teacher.email}</p>
            <div className="space-y-8">
                <div>
                    <h4 className="text-xl font-bold mb-4 text-gray-700">الشعب الدراسية</h4>
                    <ClassManagement teacherId={teacher.id} />
                </div>
                 <div>
                    <h4 className="text-xl font-bold mb-4 text-gray-700">الطلاب</h4>
                    <StudentManagement teacherId={teacher.id} />
                </div>
            </div>
        </div>
    );
}


// Admin Content Management
function AdminContentManagement() {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">إدارة محتوى النظام</h3>
            <p className="text-gray-600">هنا يمكن للمدير عرض، تعديل، أو حذف أي شعبة، طالب، أو امتحان في النظام بأكمله.</p>
            <p className="mt-4 text-sm text-blue-600 bg-blue-50 p-3 rounded-md">هذه الميزة قيد التطوير وتتطلب إنشاء واجهات عرض للبيانات الشاملة.</p>
        </div>
    );
}

// Admin Activity Log
function AdminActivityLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching activity logs:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const formatLog = (log) => {
        switch (log.action) {
            case 'teacher_approved':
                return `وافق المدير ${log.details.adminName} على المعلم ${log.details.teacherName}.`;
            case 'teacher_registered':
                return `سجل المعلم الجديد ${log.details.name} (${log.details.email}).`;
            case 'admin_registered':
                return `تم إنشاء حساب مدير جديد: ${log.details.name}.`;
            default:
                return log.action;
        }
    };

    if (loading) return <p>جاري تحميل السجل...</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">سجل نشاطات النظام</h3>
            <div className="space-y-3">
                {logs.map(log => (
                    <div key={log.id} className="flex items-start p-3 bg-gray-50 rounded-md">
                        <Activity className="w-5 h-5 text-gray-500 mt-1 ml-3"/>
                        <div>
                            <p className="font-medium text-gray-800">{formatLog(log)}</p>
                            <p className="text-xs text-gray-500">
                                {log.timestamp?.toDate().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


// Platform Settings Tab for Admin
function PlatformSettings() {
    const [platformName, setPlatformName] = useState('');
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const settingsDocRef = doc(db, "settings", "platform");

    useEffect(() => {
        const fetchSettings = async () => {
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists()) {
                setPlatformName(docSnap.data().name);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSaveSettings = async () => {
        await setDoc(settingsDocRef, { name: platformName });
        setNotification({ message: "تم حفظ الإعدادات بنجاح!", type: 'success' });
    };

    if (loading) return <p>جاري تحميل الإعدادات...</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
             {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            <h3 className="text-2xl font-bold mb-6 text-gray-800">إعدادات المنصة</h3>
            <div className="space-y-4 max-w-lg">
                <div>
                    <label htmlFor="platformName" className="block text-sm font-medium text-gray-700">اسم المنصة</label>
                    <input 
                        type="text" 
                        id="platformName" 
                        value={platformName}
                        onChange={(e) => setPlatformName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="flex justify-end">
                    <button onClick={handleSaveSettings} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ التغييرات</button>
                </div>
            </div>
        </div>
    );
}


// Teacher Dashboard Component
function TeacherDashboard({ user, userData, onLogout }) {
    const [activeTab, setActiveTab] = useState('classes');

    const renderContent = () => {
        switch (activeTab) {
            case 'classes':
                return <ClassManagement teacherId={user.uid} />;
            case 'students':
                return <StudentManagement teacherId={user.uid} />;
            case 'exams':
                return <ExamManagement teacherId={user.uid} />;
            case 'stats':
                return <TeacherStats teacherId={user.uid} />;
            default:
                return <ClassManagement teacherId={user.uid} />;
        }
    };
    
    const menuItems = [
        { id: 'classes', label: 'إدارة الشعب', icon: Book },
        { id: 'students', label: 'إدارة الطلاب', icon: Users },
        { id: 'exams', label: 'إدارة الامتحانات', icon: FileText },
        { id: 'stats', label: 'الإحصائيات', icon: BarChart2 },
    ];

    return (
        <div className="flex h-screen bg-gray-50 font-sans" dir="rtl">
            <aside className="w-64 bg-white shadow-lg flex flex-col">
                <div className="h-20 flex items-center justify-center border-b">
                    <h1 className="text-xl font-bold text-gray-800">لوحة تحكم المعلم</h1>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center px-4 py-3 text-right rounded-lg transition-colors ${
                                activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="ml-3 h-5 w-5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t">
                    <button onClick={onLogout} className="w-full flex items-center px-4 py-3 text-right text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                        <LogOut className="ml-3 h-5 w-5" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>
            
            <main className="flex-1 flex flex-col">
                <header className="h-20 bg-white border-b flex items-center justify-between px-8">
                    <h2 className="text-2xl font-semibold text-gray-700">مرحباً, {userData.name}</h2>
                </header>
                <div className="flex-1 p-8 overflow-y-auto bg-gray-100">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

// Class Management for Teacher
function ClassManagement({ teacherId }) {
    const [classes, setClasses] = useState([]);
    const [className, setClassName] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(null);

    useEffect(() => {
        if (!teacherId) return;

        const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const classesData = [];
            querySnapshot.forEach((doc) => {
                classesData.push({ id: doc.id, ...doc.data() });
            });
            setClasses(classesData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error in ClassManagement:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [teacherId]);

    const handleAddClass = async () => {
        if (className.trim() === '') return;
        await addDoc(collection(db, "classes"), { name: className, teacherId: teacherId, createdAt: serverTimestamp() });
        setClassName('');
        setShowAddModal(false);
    };
    
    const handleDeleteClass = async () => {
        if (!showDeleteModal) return;
        await deleteDoc(doc(db, "classes", showDeleteModal));
        setShowDeleteModal(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">الشعب الدراسية</h3>
                <button onClick={() => setShowAddModal(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <PlusCircle size={20} className="ml-2"/> إضافة شعبة جديدة
                </button>
            </div>

            {loading ? <p>جاري التحميل...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.length > 0 ? classes.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-lg shadow-md flex justify-between items-center">
                        <div>
                            <h4 className="text-xl font-semibold text-gray-700">{c.name}</h4>
                        </div>
                        <button onClick={() => setShowDeleteModal(c.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100">
                            <Trash2 size={20} />
                        </button>
                    </div>
                )) : <p className="col-span-full text-center text-gray-500">لم تقم بإضافة أي شعبة بعد.</p>}
            </div>
            )}
            
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md" dir="rtl">
                        <h4 className="text-xl font-bold mb-4">إضافة شعبة جديدة</h4>
                        <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="اسم الشعبة (مثال: الصف العاشر - أ)" className="w-full p-2 border rounded-md mb-4 text-right"/>
                        <div className="flex justify-end space-x-2" dir="ltr">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">إلغاء</button>
                            <button onClick={handleAddClass} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">إضافة</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <ConfirmationModal 
                    message="هل أنت متأكد من حذف هذه الشعبة؟ سيتم حذف جميع الطلاب والامتحانات المرتبطة بها."
                    confirmText="نعم، قم بالحذف"
                    onConfirm={handleDeleteClass}
                    onCancel={() => setShowDeleteModal(null)}
                />
            )}
        </div>
    );
}

// Student Management for Teacher
function StudentManagement({ teacherId }) {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [studentName, setStudentName] = useState('');
    const [studentGrade, setStudentGrade] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setClasses(classesData);
            if (classesData.length > 0 && !selectedClass) {
                setSelectedClass(classesData[0].id);
            }
        });
        return () => unsubscribe();
    }, [teacherId, selectedClass]);

    useEffect(() => {
        if (!selectedClass) return;

        const q = query(collection(db, "students"), where("classId", "==", selectedClass));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [selectedClass]);

    const handleAddStudent = async () => {
        if (studentName.trim() === '' || studentGrade.trim() === '' || !selectedClass) return;
        const studentCode = generateCode(8);
        await addDoc(collection(db, "students"), { name: studentName, grade: studentGrade, classId: selectedClass, teacherId, studentCode, createdAt: serverTimestamp() });
        setStudentName('');
        setStudentGrade('');
        setShowAddModal(false);
    };
    
    const handleDeleteStudent = async () => {
        if (!showDeleteModal) return;
        await deleteDoc(doc(db, "students", showDeleteModal));
        setShowDeleteModal(null);
    };

    const handleFileImport = async (event) => {
        const file = event.target.files[0];
        if (file && selectedClass) {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim() !== '');
            for (const name of lines) {
                await addDoc(collection(db, "students"), {
                    name: name.trim(),
                    classId: selectedClass,
                    teacherId,
                    studentCode: generateCode(8),
                    createdAt: serverTimestamp()
                });
            }
            setNotification({ message: `${lines.length} طالب تم إضافتهم بنجاح!`, type: 'success' });
            setShowImportModal(false);
        }
    };

    return (
        <div>
            {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">إدارة الطلاب</h3>
                <div className="flex space-x-2" dir="ltr">
                    <button onClick={() => setShowAddModal(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <PlusCircle size={20} className="ml-2"/> إضافة طالب
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                        <Upload size={20} className="ml-2"/> إضافة دفعة طلاب
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <label htmlFor="class-select" className="block mb-2 text-sm font-medium text-gray-700">اختر الشعبة:</label>
                <select id="class-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full md:w-1/3 p-2 border rounded-md">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <table className="w-full text-right">
                    <thead className="border-b">
                        <tr className="bg-gray-50">
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">اسم الطالب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">الصف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">الكود الخاص</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.length > 0 ? students.map(student => (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{student.name}</td>
                                <td className="p-3 text-gray-600">{student.grade}</td>
                                <td className="p-3 font-mono text-blue-600">{student.studentCode}</td>
                                <td className="p-3">
                                    <button onClick={() => setShowDeleteModal(student.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="p-4 text-center text-gray-500">لا يوجد طلاب في هذه الشعبة.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md" dir="rtl">
                        <h4 className="text-xl font-bold mb-4">إضافة طالب جديد</h4>
                        <div className="space-y-4">
                             <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="اسم الطالب" className="w-full p-2 border rounded-md text-right" />
                             <input type="text" value={studentGrade} onChange={(e) => setStudentGrade(e.target.value)} placeholder="الصف (مثال: العاشر)" className="w-full p-2 border rounded-md text-right" />
                        </div>
                        <div className="flex justify-end space-x-2 mt-6" dir="ltr">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">إلغاء</button>
                            <button onClick={handleAddStudent} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">إضافة</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md" dir="rtl">
                        <h4 className="text-xl font-bold mb-4">إضافة دفعة طلاب من ملف</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            قم بإنشاء ملف نصي (.txt) يحتوي على اسم كل طالب في سطر منفصل. ثم قم برفع الملف هنا.
                        </p>
                        <input type="file" accept=".txt" onChange={handleFileImport} className="w-full p-2 border rounded-md mb-4" />
                        <div className="flex justify-end">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteModal && (
                <ConfirmationModal 
                    message="هل أنت متأكد من حذف هذا الطالب؟"
                    confirmText="نعم، قم بالحذف"
                    onConfirm={handleDeleteStudent}
                    onCancel={() => setShowDeleteModal(null)}
                />
            )}
        </div>
    );
}

// Exam Management for Teacher
function ExamManagement({ teacherId }) {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [notification, setNotification] = useState(null);
    
    useEffect(() => {
        if (!teacherId) return;

        const q = query(collection(db, "exams"), where("teacherId", "==", teacherId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const examsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExams(examsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [teacherId]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setNotification({ message: "تم النسخ إلى الحافظة!", type: 'success' });
        }, (err) => {
            setNotification({ message: "فشل النسخ.", type: 'error' });
        });
    };

    return (
        <div>
            {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            {showCreateModal && <CreateExamModal teacherId={teacherId} onClose={() => setShowCreateModal(false)} />}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">إدارة الامتحانات</h3>
                <button onClick={() => setShowCreateModal(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <PlusCircle size={20} className="ml-2"/> إنشاء امتحان جديد
                </button>
            </div>

            {loading ? <p>جاري تحميل الامتحانات...</p> : (
            <div className="space-y-4">
                {exams.length > 0 ? exams.map(exam => (
                    <div key={exam.id} className="bg-white p-5 rounded-lg shadow-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-xl font-semibold">{exam.title}</h4>
                                <p className="text-sm text-gray-500">الشعبة: {exam.className || 'غير محدد'}</p>
                            </div>
                            <div className="flex space-x-2" dir="ltr">
                                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"><Eye size={18} /></button>
                                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"><Edit size={18} /></button>
                                <button className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={18} /></button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex flex-col md:flex-row md:items-center md:space-x-4" dir="ltr">
                            <div className="flex-1 mb-2 md:mb-0">
                                <label className="text-xs text-gray-500">رابط الامتحان</label>
                                <div className="flex items-center">
                                    <input type="text" readOnly value={`${window.location.origin}/exam/${exam.id}`} className="w-full p-2 border rounded-l-md bg-gray-50 text-sm"/>
                                    <button onClick={() => copyToClipboard(`${window.location.origin}/exam/${exam.id}`)} className="bg-gray-200 px-3 py-2 border border-l-0 rounded-r-md hover:bg-gray-300"><Copy size={16}/></button>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500">رمز الامتحان</label>
                                <div className="flex items-center">
                                    <input type="text" readOnly value={exam.examCode} className="w-full p-2 border rounded-l-md bg-gray-50 text-sm font-mono"/>
                                    <button onClick={() => copyToClipboard(exam.examCode)} className="bg-gray-200 px-3 py-2 border border-l-0 rounded-r-md hover:bg-gray-300"><Copy size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500">لم تقم بإنشاء أي امتحانات بعد.</p>}
            </div>
            )}
        </div>
    );
}

// Create Exam Modal
function CreateExamModal({ teacherId, onClose }) {
    const [title, setTitle] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [classes, setClasses] = useState([]);
    const [questions, setQuestions] = useState([{ text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);

    useEffect(() => {
        const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [teacherId]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
    };

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };
    
    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };
    
    const handleRemoveQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
    };

    const handleSaveExam = async () => {
        if (!title || !selectedClass || questions.length === 0) {
            alert("يرجى ملء جميع الحقول وإضافة سؤال واحد على الأقل.");
            return;
        }
        const examCode = generateCode(6);
        const className = classes.find(c => c.id === selectedClass)?.name || '';
        
        await addDoc(collection(db, "exams"), {
            title,
            classId: selectedClass,
            className,
            teacherId,
            examCode,
            questions,
            createdAt: serverTimestamp()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl h-full max-h-[90vh] flex flex-col" dir="rtl">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h3 className="text-2xl font-bold">إنشاء امتحان جديد</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X size={24}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الامتحان" className="w-full p-2 border rounded-md"/>
                        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="" disabled>اختر الشعبة</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="bg-gray-50 p-4 rounded-lg mb-4 border">
                            <div className="flex justify-between items-center mb-2">
                                <label className="font-semibold">السؤال {qIndex + 1}</label>
                                {questions.length > 1 && <button onClick={() => handleRemoveQuestion(qIndex)} className="text-red-500"><Trash2 size={18}/></button>}
                            </div>
                            <textarea value={q.text} onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} placeholder="نص السؤال" className="w-full p-2 border rounded-md mb-2"></textarea>
                            <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center">
                                        <input type="radio" name={`q${qIndex}_correct`} checked={q.correctAnswerIndex === oIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)} className="ml-2"/>
                                        <input type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`الخيار ${oIndex + 1}`} className="w-full p-2 border rounded-md"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button onClick={handleAddQuestion} className="flex items-center text-blue-600 font-semibold mt-4"><Plus size={20} className="ml-1"/> إضافة سؤال</button>
                </div>

                <div className="flex justify-end space-x-2 mt-6 pt-4 border-t" dir="ltr">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-300 rounded-md hover:bg-gray-400">إلغاء</button>
                    <button onClick={handleSaveExam} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ الامتحان</button>
                </div>
            </div>
        </div>
    );
}


// Teacher Stats
function TeacherStats({ teacherId }) {
    const [notification, setNotification] = useState(null);
    
    const handleDownloadStats = () => {
        setNotification({ message: "ميزة تحميل الإحصائيات قيد التطوير.", type: 'info' });
    };

    return (
        <div>
            {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">إحصائيات الأداء</h3>
                <button onClick={handleDownloadStats} className="flex items-center bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                    <Download size={20} className="ml-2"/> تحميل الإحصائيات
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h4 className="font-bold mb-4">متوسط أداء الامتحانات</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avgScore" fill="#3b82f6" name="متوسط الدرجة" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h4 className="font-bold mb-4">أداء الطلاب</h4>
                    <p>هنا يمكن عرض رسم بياني يوضح توزيع درجات الطلاب (ممتاز، جيد جداً، جيد، ...إلخ).</p>
                </div>
            </div>
        </div>
    );
}
