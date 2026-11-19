<?php

namespace Tests\Unit;

use App\Models\User;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Huy hiệu "Sinh viên đã xác thực": chỉ email thuộc tên miền trường mới đủ điều kiện.
 * Bộ dữ liệu bao gồm các trường hợp đã khiến bản cũ (dò chuỗi con) sai.
 */
class StudentEmailTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['STUDENT_EMAIL_DOMAINS']);
        putenv('STUDENT_EMAIL_DOMAINS');
    }

    /** @return array<string, array{string}> */
    public static function schoolEmails(): array
    {
        return [
            'HUTECH' => ['sv123@hutech.edu.vn'],
            'HCMUT' => ['abc@hcmut.edu.vn'],
            'subdomain st.' => ['x@st.uel.edu.vn'],
            'subdomain ms.' => ['x@ms.uit.edu.vn'],
            'subdomain student.' => ['x@student.hcmus.edu.vn'],
            'ac.vn' => ['x@ctu.ac.vn'],
            'international .edu' => ['x@mit.edu'],
            'uppercase and spaces' => ['  SV.Name@HUTECH.EDU.VN '],
        ];
    }

    /** @return array<string, array{string}> */
    public static function nonSchoolEmails(): array
    {
        return [
            'gmail' => ['x@gmail.com'],
            'buyable student.com' => ['x@student.com'],
            'students.* domain' => ['x@students.example.org'],
            'academic label inside other domain' => ['x@ac.vn.evil.com'],
            'edu.vn prefix on attacker domain' => ['fake@edu.vn.attacker.io'],
            'registry itself, not a school' => ['x@edu.vn'],
            'edu as a label, not suffix' => ['x@edu.example.com'],
            'suffix without dot boundary' => ['x@notedu.vn'],
            'not an email' => ['hutech.edu.vn'],
            'empty' => [''],
        ];
    }

    #[DataProvider('schoolEmails')]
    public function test_school_domains_get_the_badge(string $email): void
    {
        self::assertTrue(User::isStudentEmail($email), $email);
    }

    #[DataProvider('nonSchoolEmails')]
    public function test_other_domains_do_not_get_the_badge(string $email): void
    {
        self::assertFalse(User::isStudentEmail($email), $email);
    }

    public function test_configured_school_domains_are_accepted_with_subdomains(): void
    {
        $_ENV['STUDENT_EMAIL_DOMAINS'] = ' udn.vn , @ox.ac.uk ';

        self::assertTrue(User::isStudentEmail('x@sv.dut.udn.vn'));
        self::assertTrue(User::isStudentEmail('x@udn.vn'));
        self::assertTrue(User::isStudentEmail('x@ox.ac.uk'));
        self::assertFalse(User::isStudentEmail('x@udn.vn.evil.com'));
        self::assertFalse(User::isStudentEmail('x@fakeudn.vn'));
    }

    public function test_bare_tld_in_configuration_is_ignored(): void
    {
        $_ENV['STUDENT_EMAIL_DOMAINS'] = 'com,vn';

        self::assertFalse(User::isStudentEmail('x@gmail.com'));
        self::assertFalse(User::isStudentEmail('x@example.vn'));
    }
}
