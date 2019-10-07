my @files = <test/*>;
runtests(@files);

sub runtests {
    my @files = @_;
    foreach (@files) {
	if ($_ =~ /\.lox/) {
	    if (runtest($_) == 0) {
		return 0;
	    }
	} elsif (-d $_) {
	    my @rfiles = <$_/*>;
	    if (runtests (@rfiles) == 0) {
		return 0;
	    }
	} else {
	    print "skipping $_\n";
	}
    }
    return 1;
}

sub runtest {
    my ($file) = @_;
    my $cmd = "node bin/main.js $file";
    print "$cmd\n";
    system("$cmd 1>me.log 2>&1");
    $cmd = "(cd ../craftinginterpreters-master/; ./jlox $file)";
    print "$cmd\n";
    system("$cmd 1>bob.log 2>&1");
    print `diff me.log bob.log`;
    print "\n=======\n";
}

__END__	
sub runtest {
    my ($file) = @_;
    my $cmd = "node bin/main.js $file";
    print "$cmd\n";
    system("$cmd 1>out.log 2>&1");
    my $r = $?;
    if ($r == -1) {
	print "failed to execute $file: $!\n";
	return 0;
    } elsif ($r & 127) {
	printf "child died with signal %d, %s coredump\n", ($r & 127), ($r & 128) ? "with" : "without";
	return 0;
    } else {
	printf "child exited with value %d\n", $r >> 8;
	print "---------\n";
	print `cat out.log`;
	print "---------\n";
	if ($r >> 8 == 0) {
	    return 1;
	} else {
	    return 0;
	}
    }
}
