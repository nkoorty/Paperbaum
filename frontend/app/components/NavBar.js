"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './navbar.module.css';

const NavBar = () => {
    const [isSolid, setIsSolid] = useState(false);

    const handleScroll = () => {
        if (window.scrollY > 100) {
            setIsSolid(true);
        } else {
            setIsSolid(false);
        }
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <nav className={`${styles.navbar} ${isSolid ? styles.solid : ''}`}>
            <div className={styles.logo}>
                <Link href="/">ZKnowledge</Link>
            </div>
            <ul className={styles.navLinks}>
                <li><Link href="/upload">Upload</Link></li>
                <li><Link href="https://github.com">GitHub</Link></li>
            </ul>
            <ul className={styles.navLinks}>
                <p>Coming Soon</p>
            </ul>
        </nav>
    );
};

export default NavBar;
